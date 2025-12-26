import { checkAllotmentStatus } from '../services/scraper.service.js';
import Mainboard from '../models/Mainboard.model.js';

export const checkAllotment = async (req, res, next) => {
    try {
        const { pan, ipoId } = req.body;

        if (!pan || !ipoId) {
            return res.status(400).json({ success: false, message: "PAN and IPO ID are required." });
        }

        // Find the IPO to get the Registrar Name
        const ipo = await Mainboard.findById(ipoId);
        if (!ipo) {
            return res.status(404).json({ success: false, message: "IPO not found." });
        }

        const registrarName = ipo.registrarName;

        if (!registrarName) {
            return res.status(400).json({ success: false, message: "This IPO does not have a linked Registrar." });
        }

        // Call the scraper service
        const result = await checkAllotmentStatus(registrarName, pan);

        res.status(200).json({
            success: true,
            data: {
                ipoName: ipo.companyName,
                registrar: registrarName,
                allotmentStatus: result
            }
        });

    } catch (error) {
        console.error("Allotment Check Error:", error);
        res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
    }
};
