import { z } from "zod";

const safeBoolean = z.preprocess((val) => {
    if (typeof val === 'string') {
        return val === 'true';
    }
    return Boolean(val);
}, z.boolean());


export const ipoCreateSchema = z.object({
    body: z.object({
        companyName: z.string().min(1, "Company name is required"),
        slug: z.string().optional(),
        icon: z.string().optional(),
        ipoType: z.enum(["MAINBOARD", "SME"]).optional(),
        status: z.enum(["UPCOMING", "OPEN", "CLOSED", "LISTED"]),
        subscription: z.object({
            qib: z.coerce.number().optional().default(0),
            nii: z.coerce.number().optional().default(0),
            retail: z.coerce.number().optional().default(0),
            employee: z.coerce.number().optional().default(0),
            total: z.coerce.number().optional().default(0),
        }).optional(),
        gmp: z.array(z.object({
            price: z.coerce.number().optional(),
            kostak: z.string().optional(),
            date: z.coerce.date().optional(),
        })).optional(),
        registrarName: z.string().optional(),
        registrarLink: z.string().optional(),
        open_date: z.coerce.date(),
        close_date: z.coerce.date(),
        listing_date: z.coerce.date(),
        refund_date: z.coerce.date(),
        allotment_date: z.coerce.date(),
        lot_size: z.coerce.number(),
        lot_price: z.coerce.number(),
        bse_code_nse_code: z.string(),
        isAllotmentOut: safeBoolean,
        rhp_pdf: z.string().optional(),
        drhp_pdf: z.string().optional(),
        financials: z.object({
            revenue: z.coerce.number().optional(),
            profit: z.coerce.number().optional(),
            eps: z.coerce.number().optional(),
            valuation: z.string().optional(),
        }).optional(),
        listing_info: z.object({
            listing_price: z.coerce.number().optional(),
            listing_gain: z.coerce.number().optional(),
            day_high: z.coerce.number().optional(),
            day_low: z.coerce.number().optional(),
        }).optional(),
    }),
}).superRefine((data, ctx) => {
    if ((data.body.status === "CLOSED" || data.body.status === "LISTED")) {
        if (!data.body.registrarName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Registrar Name is required when status is CLOSED or LISTED",
                path: ["body", "registrarName"],
            });
        }
        if (!data.body.registrarLink) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Registrar Link is required when status is CLOSED or LISTED",
                path: ["body", "registrarLink"],
            });
        }
    }
});

export const ipoUpdateSchema = z.object({
    body: z.object({
        companyName: z.string().min(3).optional(),
        ipoType: z.enum(["MAINBOARD", "SME"]).optional(),
        status: z.string().optional(),
        open_date: z.coerce.date().optional(),
        close_date: z.coerce.date().optional(),
        listing_date: z.coerce.date().optional(),
        refund_date: z.coerce.date().optional(),
        allotment_date: z.coerce.date().optional(),
        lot_size: z.coerce.number().optional(),
        lot_price: z.coerce.number().optional(),
        bse_code_nse_code: z.string().optional(),
        isAllotmentOut: safeBoolean.optional(),
        subscription: z.object({
            qib: z.coerce.number().optional(),
            nii: z.coerce.number().optional(),
            retail: z.coerce.number().optional(),
            employee: z.coerce.number().optional(),
            total: z.coerce.number().optional(),
        }).optional(),
        gmp: z.array(z.object({
            price: z.coerce.number().optional(),
            kostak: z.string().optional(),
            date: z.coerce.date().optional(),
        })).optional(),
        registrarName: z.string().optional(),
        registrarLink: z.string().optional(),
        rhp_pdf: z.string().optional(),
        drhp_pdf: z.string().optional(),
        financials: z.object({
            revenue: z.coerce.number().optional(),
            profit: z.coerce.number().optional(),
            eps: z.coerce.number().optional(),
            valuation: z.string().optional(),
        }).optional(),
        listing_info: z.object({
            listing_price: z.coerce.number().optional(),
            listing_gain: z.coerce.number().optional(),
            day_high: z.coerce.number().optional(),
            day_low: z.coerce.number().optional(),
        }).optional(),
    }),
}).superRefine((data, ctx) => {
    if ((data.body.status === "CLOSED" || data.body.status === "LISTED")) {
        if (!data.body.registrarName) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Registrar Name is required when status is CLOSED or LISTED",
                path: ["body", "registrarName"],
            });
        }
        if (!data.body.registrarLink) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Registrar Link is required when status is CLOSED or LISTED",
                path: ["body", "registrarLink"],
            });
        }
    }
});
