const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const mongoose = require('mongoose');
const methodOverride = require('method-override');
const passport = require('passport');
const localStrategy = require('passport-local').Strategy;
dotenv.config({path : './configure.env'});

const userRouter = require('./routes/user');
const User = require('./models/userModel');
const adminRouter = require('./routes/admin');


mongoose.connect(process.env.DATABASE , {
      useNewUrlParser:true ,
      useUnifiedTopology:true, 
      useCreateIndex:true }).then(connect => {
          console.log('Connected to database');
      })

const app = express();

app.set('view engine' , 'ejs');
app.use(express.static(path.join(__dirname,'public')));
app.use(bodyParser.urlencoded({extended : true}))
app.set('views' , path.join(__dirname ,'views'));


app.use(flash());

//middleware for express session
app.use(session({
    secret : 'Hero web scrapper app',
    resave :true ,
    saveUninitialized :true
}))

//Passport middleware

app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy({usernameField : 'email'} , User.authenticate()))
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(methodOverride('_method'));

//middleware for global variables

app.use( (req,res,next) => {
 res.locals.success_msg = req.flash(('success_msg'));
 res.locals.error_msg = req.flash(('error_msg'));
 res.locals.error = req.flash(('error'));
 res.locals.currentUser = req.user;
 next();
})




app.use(userRouter);
app.use(adminRouter);

app.listen(process.env.PORT , () => {
    console.log('server started listening to port 3000')
})