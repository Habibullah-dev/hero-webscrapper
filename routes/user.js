const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require('../models/userModel');
const crypto = require('crypto');
const async = require('async');
const nodemailer = require('nodemailer');


function isauthenticatedUser(req,res,next){
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg' , 'Login to access this page');
    res.redirect('/login');
}

//........... Get Router..............

router.get('/login' , (req , res) => {
    res.render('./user/login')
});

router.get('/signup' , (req , res) => {
    res.render('./user/signup')
});

router.get('/logout' , (req , res) => {
    req.logOut();
    req.flash('success_msg' , 'Logout Successful');
    res.redirect('/login');
})

router.get('/forget' , (req , res) => {
    res.render('./user/forget');
});
router.get('/newpassword' , (req , res) => {
    res.render('./user/newpassword');
});
router.get('/changepassword' , (req , res) => {
    res.render('./user/changepassword');
});

router.get('/reset/:token' , (req , res) => {
    let token = req.params.token;
    User.findOne({ resetPasswordToken : token , resetPasswordExpire : {$gt : Date.now()}})
    .then(user => {
        if(!user) {
            req.flash('error_msg' , 'Rest password or token expired');
            res.redirect('/forget');
        }
        res.render('./user/newpassword' , {token : token});
    })
    .catch(err => {
        if(err) {
            req.flash('error_msg' , 'Error ' + err);
            res.redirect('/login');
        }
    })
});

//........... Post Route...............
router.post('/signup' , (req , res) => {
 const {name , email , password , passwordConfirm} = req.body;

 if(password !== passwordConfirm) {
     req.flash('error_msg' , 'Password not match')
    return res.redirect('/signup')
 }

 const userData = {
     name,
     email,
 }
User.register(userData , password , (err , user) => {
    if(err) {
        req.flash('error_msg' , 'ERROR ' + err);
        res.redirect('/signup')
    }
    passport.authenticate('local')(req , res , () => {
        req.flash('success_msg' , 'Registration Successful');
        res.redirect('/login')
    })
})

})

router.post('/login', passport.authenticate('local', {
    successRedirect : '/dashboard',
    failureRedirect : '/login',
    failureFlash: 'Invalid email or password. Try Again!!!'
}));

router.post('/forget', (req, res, next)=> {
    let recoveryPassword = '';
    async.waterfall([
        (done) => {
            crypto.randomBytes(20, (err , buf) => {
                let token = buf.toString('hex');
                done(err, token);
            });
        },
        (token, done) => {
            User.findOne({email : req.body.email})
                .then(user => {
                    if(!user) {
                        req.flash('error_msg', 'User does not exist with this email.');
                        return res.redirect('/forget');
                    }

                    user.resetPasswordToken = token;
                    user.resetPasswordExpire = Date.now() + 1800000; //   1/2 hours

                    user.save(err => {
                        done(err, token, user);
                    });
                })
                .catch(err => {
                    req.flash('error_msg', 'ERROR: '+err);
                    res.redirect('/forget');
                })
        },
        (token, user) => {
            let smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user : process.env.EMAIL,
                    pass: process.env.PASS
                }
            });

            let mailOptions = {
                to: user.email,
                from : 'Hero Webscraping',
                subject : 'Recovery Email from Hero Webscrapping',
                text : 'Please click the following link to recover your passoword: \n\n'+
                        'http://'+ req.headers.host +'/reset/'+token+'\n\n'+
                        'If you did not request this, please ignore this email.'
            };
            smtpTransport.sendMail(mailOptions, err=> {
                req.flash('success_msg', 'Email send with further instructions. Please check that.');
                res.redirect('/forget');
            });
        }

    ], err => {
        if(err) res.redirect('/forget');
    });
});

router.post('/reset/:token' , (req , res) => {
    const {password , confirmPassword} = req.body;
    const token = req.params.token;
    async.waterfall(
        [
            (done) => {
                User.findOne({resetPasswordToken : token , resetPasswordExpire : { $gt : Date.now()}})
                .then(user => {
                    if(!user) {
                        req.flash('error_msg' , 'Invalid Password or reset token expires');
                        res.redirect('/forget')
                    }
                    if( password !== confirmPassword) {
                        req.flash('error_msg' , 'Password not match');
                        return res.redirect('/forget');
                    }
                    User.setPassword(password , err => {
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpire = undefined;

                        user.save(err => {
                            req.logIn(user, err => {
                                done(err,user);
                            });
                           
                        });
                    });
                })
            },
            (user) => {
                const smtpTransport = nodemailer.createTransport({
                    service : 'Gmail' ,
                    auth : {
                        user : process.env.EMAIL ,
                        pass: process.env.PASS
                    }

                });
                const mailOptions  = {
                    to : user.email ,
                    from : 'Hero Scrapper',
                    subject : 'Your password has been changed',
                    text : 'Dear ' + user.name + "\n"
                        + 'This is a confirmation message that your password with account ' +
                        user.email + 'has been changed successfully'

                }
                
                smtpTransport.sendMail(mailOptions , err => {
                    if(!err) {
                        req.flash('success_msg' , 'New password saved successful');
                        res.redirect('/login');
                    }
                })
            }
        ] , err => {
        if(err) {
            req.flash('error_msg ' , 'Error ' + err);
            res.redirect('/forget')
        }
    })
});

router.post('/changepassword' , (req , res) => {
    const {password , confirmPassword} = req.body;
    if(password !== confirmPassword) {
        req.flash('error_msg' , 'Password not match or invalid');
        return res.redirect('/changepassword');
    }    
    User.findOne({email : req.user.email})
    .then(user => {
        user.setPassword(password , err => {
            if(!err) {
                user.save()
                .then(user => {
                    req.flash('success_msg' , 'password changed successful');
                    res.redirect('/changepassword');
                })
                .catch(err => {
                    req.flash('error_msg' , 'Error ' + err);
                    res.redirect('/changepassword')
                })
            }
        })
    })
});



module.exports = router;