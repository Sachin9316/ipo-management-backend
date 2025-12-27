/**
 * @swagger
 * components:
 *   schemas:
 *     Mainboard:
 *       type: object
 *       required:
 *         - companyName
 *         - priceRange
 *       properties:
 *         id:
 *           type: string
 *           description: The auto-generated id of the IPO
 *         companyName:
 *           type: string
 *           description: Name of the company
 *         priceRange:
 *           type: string
 *           description: Price range of the IPO
 *         issueSize:
 *           type: string
 *           description: Issue size of the IPO
 *       example:
 *         id: d5fE_asz
 *         companyName: TechCorp
 *         priceRange: 100-200
 *         issueSize: 500 Cr
 */
