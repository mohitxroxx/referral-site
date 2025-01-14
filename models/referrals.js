const mongoose = require("mongoose")

const referralSchema = new mongoose.Schema({
    posted_by: {
        type: String,
        unique:true,
        required: true,
    },
    company_name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    qualifications: {
        type: String,
        required: true,
    },
    price: {
        type: String,
        required: true,
    }
})
module.exports = mongoose.model("Referral", referralSchema)