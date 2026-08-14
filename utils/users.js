// Load environment variables
require('dotenv').config();

// Export all application users
module.exports = {


    salesRM: {
        username: process.env.SALES_RM_USERNAME,
        password: process.env.SALES_RM_PASSWORD
    },

    salesSupervisor: {
        username: process.env.SALES_SUPERVISOR_USERNAME,
        password: process.env.SALES_SUPERVISOR_PASSWORD
    },

    creditUW: {
        username: process.env.CREDIT_UW_USERNAME,
        password: process.env.CREDIT_UW_PASSWORD
    },

    opsMaker: {
        username: process.env.OPS_MAKER_USERNAME,
        password: process.env.OPS_MAKER_PASSWORD
    },

    opsChecker: {
        username: process.env.OPS_CHECKER_USERNAME,
        password: process.env.OPS_CHECKER_PASSWORD
    },

    creditHead: {
        username: process.env.CREDIT_HEAD_USERNAME,
        password: process.env.CREDIT_HEAD_PASSWORD
    },

    itApplicationManager: {
        username: process.env.IT_APPLICATION_MANAGER_USERNAME,
        password: process.env.IT_APPLICATION_MANAGER_PASSWORD
    },

    itHead: {
        username: process.env.IT_HEAD_USERNAME,
        password: process.env.IT_HEAD_PASSWORD
    },

    // =========================
    // LMS USERS
    // =========================

    lmsOpsMaker: {
        username: process.env.LMS_OPS_MAKER_USERNAME,
        password: process.env.LMS_OPS_MAKER_PASSWORD
    },

    lmsOpsChecker: {
        username: process.env.LMS_OPS_CHECKER_USERNAME,
        password: process.env.LMS_OPS_CHECKER_PASSWORD
    }

};