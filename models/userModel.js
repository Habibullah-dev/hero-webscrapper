const mongoose = require('mongoose');
const mongooseLocal = require('passport-local-mongoose');

const userSchema = new mongoose.Schema({
    name : String ,
    email : String ,
    password : {
        type : String ,
        select : false
    } ,
    resetPasswordToken : String ,
    resetPasswordExpire : Date
})
userSchema.plugin(mongooseLocal , {usernameField : 'email'});
module.exports = mongoose.model('User' , userSchema);