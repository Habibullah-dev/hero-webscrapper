const express = require('express');
const router = express.Router();
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

//requiring product model
let Product = require('../models/productModel');

// Checks if user is authenticated
function isAuthenticatedUser(req, res, next) {
    if(req.isAuthenticated()) {
        return next();
    }
    req.flash('error_msg', 'Please Login first to access this page.')
    res.redirect('/login');
}

let browser;

//Scrape Function
async function scrapeData(url, page) {
    try {
        await page.goto(url, {waitUntil: 'load', timeout : 0});
        const html = await page.evaluate(()=> document.body.innerHTML);

         
        const $ = await cheerio.load(html);

        let title = $("h1").attr('content');
        let price = $(".price-characteristic").attr("content");

        

        if(!price) {
            let dollars = $("#price > div > span.hide-content.display-inline-block-m > span > span.price-group.price-out-of-stock > span.price-characteristic").text();
            let cents = $("#price > div > span.hide-content.display-inline-block-m > span > span.price-group.price-out-of-stock > span.price-mantissa").text();
            price = dollars+'.'+cents;
        }

        let seller = '';
        let checkSeller = $('.seller-name');
        if(checkSeller) {
            seller = checkSeller.text();
        }

        let outOfStock = '';
        let checkOutOfStock = $('.prod-ProductOffer-oosMsg');
        if(checkOutOfStock) {
            outOfStock = checkOutOfStock.text();
        }

        let deliveryNotAvaiable = '';
        let checkDeliveryNotAvailable = $('.fulfillment-shipping-text');
        if(checkDeliveryNotAvailable) {
            deliveryNotAvaiable = checkDeliveryNotAvailable.text();
        }

        let stock = '';

        if(!(seller.includes('Walmart')) || outOfStock.includes('Out of Stock') || 
            deliveryNotAvaiable.includes('Delivery not available')) {
                stock = 'Out of stock';
            } else {
                stock = 'In stock';
            }

        return {
            title,
            price,
            stock,
            url
        }

    } catch (error) {
        console.log(error);
    }
}

//GET routes starts here

router.get('/', (req,res)=> {
    res.render('./user/index');
});

router.get('/dashboard', isAuthenticatedUser,(req,res)=> {

    Product.find({})
        .then(products => {
            res.render('./admin/dashboard', {products : products});
    });
    
});


router.get('/product/new', isAuthenticatedUser, async (req, res)=> {
    try {
        let url = req.query.search;
        if(url) {
            browser = await puppeteer.launch({ headless : false , args: ['--no-sandbox'] });
            const page = await browser.newPage();
            let result = await scrapeData(url,page);

            let productData = {
                title : result.title,
                price : '$'+result.price,
                stock : result.stock,
                productUrl : result.url
            };
            res.render('./admin/newproduct', {productData : productData});
            await browser.close();
        } else {
            let productData = {
                title : "",
                price : "",
                stock : "",
                productUrl : ""
            };
            res.render('./admin/newproduct', {productData : productData});
        }
    } catch (error) {
        req.flash('error_msg', 'ERROR: '+error);
        res.redirect('/product/new');
    }
});

router.get('/product/search', isAuthenticatedUser, (req,res)=> {
    let userSku = req.query.sku;
    if(userSku) {
        Product.findOne({sku : userSku})
            .then(product => {
                if(!product) {
                    req.flash('error_msg', 'Product does not exist in the database.');
                    return res.redirect('/product/search');
                }

                res.render('./admin/search', {productData : product});
            })
            .catch(err => {
                req.flash('error_msg', 'ERROR: '+err);
                res.redirect('/product/new');
            });
    } else {
        res.render('./admin/search', {productData : ''});
    }
});

router.get('/product/instock' , isAuthenticatedUser , (req , res ) => {
    Product.find({newStock : 'In stock'})
    .then(products => {
        if(products) {
            res.render('./admin/instock' , {products : products});
        }
        else {
            res.render('./admin/instock' , '');
        }
        
    })
    .catch(err => {
        req.flash('error_msg' , 'ERROR: ' + err);
        res.redirect('/dashboard');
    })
});
router.get('/product/outofstock' , isAuthenticatedUser , (req , res ) => {
    Product.find({newStock : 'Out of stock'})
    .then(products => {
        if(products) {
            res.render('./admin/outofstock' , {products : products});
        }
        else {
            res.render('./admin/outofstock' , '');
        }
        
    })
    .catch(err => {
        req.flash('error_msg' , 'ERROR: ' + err);
        res.redirect('/dashboard');
    })
});
router.get('/product/pricechanged' , isAuthenticatedUser , (req , res ) => {
    Product.find({})
    .then(products => {
        if(products) {
            res.render('./admin/pricechanged' , {products : products});
        }
        else {
            res.render('./admin/pricechanged' , '');
        }
        
    })
    .catch(err => {
        req.flash('error_msg' , 'ERROR: ' + err);
        res.redirect('/dashboard');
    })
});
router.get('/product/backinstock' , isAuthenticatedUser , (req , res ) => {
    Product.find({$and : [ {oldStock : 'Out of stock' }, {newStock : 'In stock'} ]})
    .then(products => {
        if(products) {
            res.render('./admin/backinstock' , {products : products});
        }
        else {
            res.render('./admin/backinstock' , '');
        }
        
    })
    .catch(err => {
        req.flash('error_msg' , 'ERROR: ' + err);
        res.redirect('/dashboard');
    })
});
router.get('/product/updated' , isAuthenticatedUser , (req , res ) => {
    Product.find({updateStatus : 'Updated'})
    .then(products => {
        if(products) {
            res.render('./admin/updated' , {products : products});
        }
        else {
            res.render('./admin/updated' , '');
        }
        
    })
    .catch(err => {
        req.flash('error_msg' , 'ERROR: ' + err);
        res.redirect('/dashboard');
    })
});
router.get('/product/notupdated' , isAuthenticatedUser , (req , res ) => {
    Product.find({updateStatus : 'Not Updated'})
    .then(products => {
        if(products) {
            res.render('./admin/notupdated' , {products : products});
        }
        else {
            res.render('./admin/notupdated' , '');
        }
        
    })
    .catch(err => {
        req.flash('error_msg' , 'ERROR: ' + err);
        res.redirect('/dashboard');
    })
});

router.get('/update' , (req , res) => {
    res.render('./admin/update' , { message : ''})
})

// Post route starts here

router.post('/product/new', isAuthenticatedUser, (req,res)=> {
    let {title, price, stock, url, sku} = req.body;

    let newProduct = {
        title : title,
        newPrice : price,
        oldPrice : price,
        newStock : stock,
        oldStock : stock,
        sku : sku,
        company : "Walmart",
        url : url,
        updateStatus : "Updated"
    };

    Product.findOne({ sku : sku})
        .then(product => {
            if(product) {
                req.flash('error_msg', 'Product already exist in the database.');
                return res.redirect('/product/new');
            }

            Product.create(newProduct)
                .then(product => {
                    req.flash('success_msg', 'Product added successfully in the database.');
                    res.redirect('/product/new');
                })
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: '+err);
            res.redirect('/product/new');
        });
});

router.post('/update' , isAuthenticatedUser , async (req , res) => {
    try {
        res.render('./admin/update' , { message : 'update started'});

        Product.find({})
            .then(async (products) => {
                for(let i=0 ; i < products.length ; i++) {
                    Product.updateOne({'url' : products[i].url} , { $set : { oldPrice : products[i].newPrice , oldStock : products[i].newStock , updateStatus : 'Updated'}})
     

                }
                browser = await puppeteer.launch({headless : false});
                let page = await browser.newPage();

                for(let i = 0 ; i < products.length ; i++) {
                    let result =  await scrapeData(products[i].url , page);
                    Product.updateOne({'url' : products[i].url} , { $set : {title : result.title , newPrice : "$" + result.price , newStock : result.stock , updateStatus : 'Not Updated'}})
            

                }

                await browser.close();
            })
    } catch (error) {
        req.flash('error_msg' , 'ERROR: ' + error);
        res.redirect('/dashboard');
    }
   

});

//DELETE routes starts here
router.delete('/delete/product/:id', isAuthenticatedUser, (req, res)=> {
    let searchQuery = {_id : req.params.id};

    Product.deleteOne(searchQuery)
        .then(product => {
            req.flash('success_msg', 'Product deleted successfully.');
            res.redirect('/dashboard');
        })
        .catch(err => {
            req.flash('error_msg', 'ERROR: '+err);
            res.redirect('/dashboard');
        });
});


router.get('*' , (req , res) => {
    res.render('./admin/notfound');
})



module.exports = router;

