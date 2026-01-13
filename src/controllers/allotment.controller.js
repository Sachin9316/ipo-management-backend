import Mainboard from "../models/mainboard.model.js";
import AllotmentResult from "../models/AllotmentResult.js";
import User from "../models/User.model.js";
import { checkKFintechStatus } from "../services/kfintech.service.js";
import { checkMUFGStatus } from '../services/mufg.service.js';

const TTL = {
    ALLOTTED: 24 * 60 * 60 * 1000,
    NOT_ALLOTTED: 24 * 60 * 60 * 1000,
    UNKNOWN: 45 * 60 * 1000,
    ERROR: 15 * 60 * 1000,
    CHECKING: 60 * 1000 // 60 seconds - allows worker sufficient time to complete
};

export const checkAllotment = async (req, res) => {
    try {
        debugger;
        const { ipoName, registrar, panNumbers, forceRefresh } = req.body;

        if (!ipoName || !Array.isArray(panNumbers)) {
            return res.status(400).json({ success: false, message: "Invalid payload" });
        }

        const ipo = await Mainboard.findOne({
            $or: [{ companyName: ipoName }, { slug: ipoName }]
        });

        if (!ipo) {
            return res.status(404).json({ success: false, message: "IPO not found" });
        }

        const now = Date.now();

        // 🔹 Batch cache fetch
        let cached = [];
        if (!forceRefresh) {
            cached = await AllotmentResult.find({
                ipoId: ipo._id,
                panNumber: { $in: panNumbers }
            });
        }

        const cacheMap = new Map(
            cached.map(r => [r.panNumber, r])
        );

        const results = [];
        const pansToCheck = [];

        for (const pan of panNumbers) {
            const record = cacheMap.get(pan);
            if (
                record &&
                (record.status !== 'CHECKING' || (now - new Date(record.lastChecked).getTime() < TTL.CHECKING)) && // Respect CHECKING if recent
                now - new Date(record.lastChecked).getTime() <
                (TTL[record.status] || TTL.UNKNOWN) &&
                !record.message?.includes("Registrar not supported") &&
                !record.message?.includes("IPO not found") &&
                !record.message?.includes("Worker Request Failed")
            ) {
                results.push({
                    pan,
                    status: record.status,
                    units: record.units,
                    status: record.status,
                    units: record.units,
                    message: record.message
                });
            } else {
                pansToCheck.push(pan);
            }
        }

        // 🔹 Registrar fetch
        if (pansToCheck.length) {
            let apiResponse;

            // Resolve registrar: check request param, registrarName, and registrarLink
            const registrarName = (registrar || ipo.registrarName || "").toUpperCase();
            const registrarLink = (ipo.registrarLink || ipo.registrar || "").toUpperCase();
            const registrarToUse = registrarName || registrarLink;

            console.log(`🔍 Detecting registrar for ${ipo.companyName}:`, { registrarName, registrarLink });

            if (registrarToUse.includes("KFIN")) {
                apiResponse = await checkKFintechStatus(ipo, pansToCheck);
            } else if (registrarToUse.includes("MUFG") || registrarToUse.includes("LINK") || registrarToUse.includes("INTIME")) {
                // MUFG/Link Intime
                apiResponse = await checkMUFGStatus(ipo, pansToCheck);
            } else if (registrarToUse.includes("BIGSHARE")) {
                // Bigshare
                const { checkBigshareStatus } = await import('../services/bigshare.service.js');
                apiResponse = await checkBigshareStatus(ipo, pansToCheck);
            } else {
                // For other registrars (Cameo, Skyline, Maashitla, Purva, etc.)
                // Try KFintech as fallback since many use similar systems
                console.log(`⚠️ Unknown registrar: ${registrarToUse}. Attempting KFintech fallback...`);
                try {
                    apiResponse = await checkKFintechStatus(ipo, pansToCheck);
                } catch (error) {
                    console.error(`KFintech fallback failed for ${registrarToUse}:`, error.message);
                    apiResponse = {
                        details: pansToCheck.map(p => ({
                            pan: p,
                            status: "UNKNOWN",
                            message: `Registrar not supported: ${registrarToUse}`
                        }))
                    };
                }
            }

            for (const item of apiResponse.details) {
                await AllotmentResult.findOneAndUpdate(
                    { ipoId: ipo._id, panNumber: item.pan },
                    {
                        status: item.status,
                        units: item.units || 0,
                        message: item.message,
                        status: item.status,
                        units: item.units || 0,
                        message: item.message,
                        lastChecked: new Date()
                    },
                    { upsert: true }
                );

                // optional user DP update
                if (item.dpId) {
                    await User.updateOne(
                        { "panDocuments.panNumber": item.pan },
                        { $set: { "panDocuments.$.dpId": item.dpId } }
                    );
                }

                results.push(item);
            }
        }

        res.json({
            success: true,
            summary: {
                allotted: results.filter(r => r.status === "ALLOTTED").length,
                notAllotted: results.filter(r => r.status === "NOT_ALLOTTED").length,
                notApplied: results.filter(r => r.status === "NOT_APPLIED").length,
                unknown: results.filter(r => r.status === "UNKNOWN").length,
                error: results.filter(r => r.status === "ERROR").length
            },
            data: results
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};
