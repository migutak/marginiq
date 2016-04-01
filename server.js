// server.js

    // set up ========================
    var express  = require('express');
    var app      = express();                               // create our app w/ express
    var mongoose = require('mongoose');                     // mongoose for mongodb
    var bodyParser = require('body-parser');    // pull information from HTML POST (express4)
    var mysql = require('mysql');
    var passport    = require('passport');
    var config      = require('./config/database2'); // get db config file
    var User        = require('./app/models/user'); // get the mongoose model
    var port        = process.env.PORT || 8000;
    var jwt         = require('jwt-simple');
    var http        = require('http').Server(app);
    var io          = require('socket.io')(http);
    var cors = require('cors');
   // var mongojs = require('mongojs');
   // var db = mongojs('mongodb://localhost:27017/marginiq');

 // configuration =================

    //mongoose.connect('mongodb://localhost:27017/marginiq');     // connect to mongoDB database on modulus.io
    mongoose.connect(config.database);
    
    var connectionpool = mysql.createPool({
        host     : 'localhost',
        user     : 'root',
        password : 'root',
        database : 'marginiq'
    });

    app.use(cors());

    app.use(express.static(__dirname + '/public'));                 // set the static files location /public/img will be /img for users
    app.use(express.static(__dirname + '/assets')); 
    //app.use(morgan('dev'));                                         // log every request to the console
    app.use(bodyParser.urlencoded({'extended':'true'}));            // parse application/x-www-form-urlencoded
    app.use(bodyParser.json());                                     // parse application/json
    app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
    //app.use(methodOverride());

    // Use the passport package in our application
    app.use(passport.initialize());

    // pass passport for configuration
    require('./config/passport2')(passport);

    // define model =================
    var Todo = mongoose.model('Todo', {
        text : String
    });

    // routes ======================================================================

    // api ---------------------------------------------------------------------
    // bundle our routes
    var apiRoutes = express.Router();
     
    // create a new user account (POST http://localhost:8080/api/signup)
    apiRoutes.post('/signup', function(req, res) {
      if (!req.body.name || !req.body.password) {
        res.json({success: false, msg: 'Please pass name and password.'});
      } else {
        var newUser = new User({
          name: req.body.name,
          password: req.body.password
        });
        // save the user
        newUser.save(function(err) {
          if (err) {
            return res.json({success: false, msg: 'Username already exists.'});
          }
          res.json({success: true, msg: 'Successful created new user.'});
        });
      }
    });

    //new user
    apiRoutes.post('/newuser', function(req, res){
          if (!req.body.username || !req.body.password) {
            res.json({success: false, msg: 'Please pass name and password.'});
          } else {
            var newUser = new User({
              name: req.body.username,
              password: req.body.password,
              country:req.body.country,
              fullname:req.body.fullname,
              address:req.body.address,
              entity:req.body.entity,
              entityname:req.body.entityname,
              email:req.body.email
            });
            // save the user
            newUser.save(function(err) {
              if (err) {
                return res.json({success: false, msg: 'Username already exists.'});
              }
              res.json({success: true, msg: 'Successful created new user.'});
            });
          }
    });

    // route to authenticate a user (POST http://localhost:8080/api/authenticate)
    apiRoutes.post('/authenticate', function(req, res) {
      User.findOne({
        name: req.body.name
      }, function(err, user) {
        if (err) throw err;
     
        if (!user) {
          res.send({success: false, msg: 'Authentication failed. User not found.'});
        } else {
          // check if password matches
          user.comparePassword(req.body.password, function (err, isMatch) {
            if (isMatch && !err) {
              // if user is found and password is right create a token
              var token = jwt.encode(user, config.secret);
              // return the information including token as JSON
              res.json({success: true, token: 'JWT ' + token});
            } else {
              res.send({success: false, msg: 'Authentication failed. Wrong password.'});
            }
          });
        }
      });
    });

    // route to a restricted info (GET http://localhost:8080/api/memberinfo)
    apiRoutes.get('/memberinfo', passport.authenticate('jwt', { session: false}), function(req, res) {
      var token = getToken(req.headers);
      if (token) {
        var decoded = jwt.decode(token, config.secret);
        User.findOne({
          name: decoded.name,
          entity: decoded.entity,
          entityname: decoded.entityname
        }, function(err, user) {
            if (err) throw err;
     
            if (!user) {
              return res.status(403).send({success: false, msg: 'Authentication failed. User not found.'});
            } else {
              res.json({success: true, msg: 'Welcome in the member area ' + user.name + '!', entity:user.entity, entityname:user.entityname});
            }
        });
      } else {
        return res.status(403).send({success: false, msg: 'No token provided.'});
      }
    });
     
    getToken = function (headers) {
      if (headers && headers.authorization) {
        var parted = headers.authorization.split(' ');
        if (parted.length === 2) {
          return parted[1];
        } else {
          return null;
        }
      } else {
        return null;
      }
    };

    // connect the api routes under /api/*
    app.use('/api', apiRoutes);

    io.on('connection', function(socket){
      console.log('a user connected');

      socket.on('chat message', function(msg){
        console.log('message: ' + msg);
        io.emit('chat message', msg);
      });

      socket.on('disconnect', function(){
        console.log('--- > user disconnected');
      });

    });

    // application -------------------------------------------------------------
    app.get('/', function(req, res) {
        //res.sendfile('./public/login.html');
        res.sendFile(__dirname + '/public/login.html');
    });

    app.get('/signup', function(req, res){
        res.sendfile('./public/signup.html');
    });

    app.get('/index_bank', function(req, res){
        res.sendFile(__dirname + '/public/index_bank.html');
    });
    
    app.get('/spotorders/:username', function(req,res){
    	//console.log('getData params ...',req.params.usernmame);
    	var username = req.params.username;
        connectionpool.getConnection(function(err, connection) {
            if (err) {
                console.error('CONNECTION error: ',err);
                res.statusCode = 503;
                res.send({
                    result: 'error',
                    err:    err.code
                });
            } else {
                connection.query('select distinct orderid,usernamefk,ccypair,sellorderamount+buyorderamount orderamount,sellorderamount,buyorderamount,buysell,buysellbank,'+
                	    'settlementdate,custcomment,ordertypefk,nOffers from spotorders left outer join v_orders on spotorders.orderid=v_orders.orderidfk where currentstatus in (?,?) and usernamefk = ?',['N','OfferReceived',username], function(err, rows, fields) {
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
                    res.send({
                        result: 'success',
                        data:   rows,
                        length: rows.length
                    });
                    connection.release();
                });
            }
        });
    });
    	
    	app.get('/getbankorders/:bankid', function(req,res){
    		//console.log('getData params ...',req.params.bankid);
        	var bankid = req.params.bankid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select orderindex, orderid,usernamefk,ccypair,orderdate,sellorderamount+buyorderamount orderamount,sellorderamount,buyorderamount,if(buyorderamount>0,ccybuyorderamount,ccysellorderamount) orderamountccy,buysell,buysellbank,currentstatus,'+
                    	    'settlementdate,custcomment,ordertypefk from spotorders where currentstatus = ? and recipient = ?',['N','bank1'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/mybanks/:custid', function(req,res){
            //console.log('getData params ...',req.params.bankid);
            var custid = req.params.custid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select * '+
                            'from mybanks where custid = ? ',['customer1'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });
    	
    	app.get('/get_offer/:offerid', function(req,res){
        	var offerid = req.params.offerid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,settlementdate,offeredby,ccysettleamount,settleamount,offerdate,offercomment from offers where orderidfk = ? ',[offerid], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_forward_offer/:offerid', function(req,res){
            var offerid = req.params.offerid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select * from offers_forward where orderidfk = ? ',[offerid], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });
    	
    	app.get('/get_an_offer/:offerid', function(req,res){
        	var offerid = req.params.offerid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select offerid,spotorders.orderindex,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,ccysettleamount,settleamount,offerdate,usernamefk'+
                    	    ',ccypair,orderdate,buyorderamount,sellorderamount,buyorderamount+sellorderamount orderamount,buysell,if(buysell=? AND buyorderamount > 0,3,-3) limitnum,buysellbank,currentstatus,recipient,offercomment, custcomment,ordertypefk from offers left outer join spotorders on offers.orderidfk = spotorders.orderid where offerid = ? ',['BUY',offerid], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_a_forward_offer/:offerid', function(req,res){
            var offerid = req.params.offerid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select offerid,orderidfk,o.orderindex,spot,margin,finalrate,f.settlementdate,offeredby,settlementamountccy,settlementamount,offerdate,usernamefk,freq,freqnum,startdate,buyorderamount+sellorderamount orderamount,if(buyorderamount>0,buyorderamountccy,sellorderamountccy) orderamountccy,'+
                            'ccypair,orderdate,buyorderamountccy,buyorderamount,sellorderamountccy,sellorderamount,buysell,buysellbank,currentstatus,recipient,bankcomment, custcomment,ordertypefk from offers_forward f left outer join Forwardorders o on f.orderidfk = o.orderid where offerid = ? ',[offerid], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });


        app.get('/all_open_offers_forward', function(req,res){
            var domain = req.query.domain;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select offerid,orderidfk,spot,margin,finalrate,f.settlementdate,offeredby,settlementamountccy,settlementamount,offerdate,usernamefk,freq,freqnum,startdate,buyorderamount+sellorderamount orderamount,if(buyorderamount>0,buyorderamountccy,sellorderamountccy) orderamountccy,'+
                            'ccypair,orderdate,buyorderamountccy,buyorderamount,sellorderamountccy,sellorderamount,buysell,buysellbank,currentstatus,recipient,bankcomment, custcomment,ordertypefk from offers_forward f left outer join Forwardorders o on f.orderidfk = o.orderid where offeredby = ? and status=? ',[domain,'Open'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });


      app.get('/get_all_swap_orders/:username', function(req,res){
          var username = req.params.username;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select distinct orderid,usernamefk,ccypair,nearbuyorderamountccy,nearbuyorderamount,farbuyorderamountccy,farbuyorderamount,buysell,buysellbank,nearsellorderamountccy,nearsellorderamount,'+
                          'farsellorderamountccy,farsellorderamount,if(buysell=?,3,-3) limitnum,neardate,fardate,custcomment,ordertypefk,nOffers from Swaporders left outer join v_swaporders on Swaporders.orderid=v_swaporders.orderidfk '+
                          'where Swaporders.currentstatus in (?,?) and usernamefk = ?',['BUY','N','OfferReceived',username], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/to_confirm_offers_mm', function(req,res){
          var username = req.query.username;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select offerid,orderidfk,fixedrate,daycount,totalinterest,tax,netinterest,offeredby,offerdate,status,usernamefk,mmtype,mmtypebank'+
                          ',orderdate,mmfrom,mmto,Moneymarketorders.orderamount,orderdate,ccy,bankcomment,tenuredays,recipient,custcomment,ordertypefk,currentstatus, Moneymarketorders.orderamount+totalinterest-tax netamount '+
                          'from offers_mm left outer join Moneymarketorders on offers_mm.orderidfk = Moneymarketorders.orderid where status = ? and confirm = ? and recipient = offeredby',['Accepted','Sent'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });
//
      app.get('/get_bank_orders_swap/:domain', function(req,res){
          var domain = req.params.domain;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select orderindex,orderid,usernamefk,ccypair,orderdate,nearbuyorderamountccy,nearbuyorderamount,nearsellorderamountccy,nearsellorderamount,neardate,fardate,buysell,buysellbank,currentstatus,'+
                          'custcomment, ordertypefk, nOffers from Swaporders left outer join v_swaporders on Swaporders.orderid=v_swaporders.orderidfk where Swaporders.currentstatus = ? and recipient = ? ',['N',domain], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });
//
        app.get('/get_swap_order/:orderid', function(req,res){
            var orderid = req.params.orderid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select orderindex,orderid,usernamefk,ccypair,orderdate, nearbuyorderamountccy,nearbuyorderamount,nearsellorderamountccy,nearsellorderamount,'+
                          'farbuyorderamountccy,farbuyorderamount,farsellorderamountccy,farsellorderamount,neardate,fardate,recipient,buysell,buysellbank,currentstatus,custcomment,ordertypefk from Swaporders where orderindex = ? ',[orderid], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_forward_order/:orderindex', function(req,res){
            var orderindex = req.params.orderindex;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select orderindex,orderid,usernamefk,ccypair,orderdate, buyorderamountccy,buyorderamount,sellorderamountccy,sellorderamount,'+
                          'recipient,custcomment,ordertypefk,buysell,buysellbank,currentstatus,settlementdate,freq,freqnum,startdate from Forwardorders where orderindex = ? ',[orderindex], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });
//
        app.get('/get_all_mm_orders/:username', function(req,res){
            var username = req.params.username;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select distinct orderid,usernamefk,ccy,orderamount,mmfrom,mmto,tenuredays,custcomment,ordertypefk,mmtype,nOffers '+
                          'from Moneymarketorders m left outer join v_mmorders v on m.orderid=v.orderidfk where m.currentstatus in (?,?) and usernamefk = ? ',['N','OfferReceived','dealer1@customer1.com'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_all_forward_orders/:username', function(req,res){
            var username = req.params.username;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select distinct orderid,usernamefk,ccypair,buyorderamountccy,buyorderamount,sellorderamountccy,custcomment,sellorderamount,recipient,nOffers,'+
                          'buysell, buysellbank,freq,freqnum,startdate from Forwardorders m left outer join v_forwardoffers v on m.orderid=v.orderidfk where m.currentstatus in (?,?) and usernamefk = ? ',['N','OfferReceived',username], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_bank_orders_forward/:username', function(req,res){
            var username = req.params.username;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select distinct orderid,orderindex,usernamefk,ccypair,buyorderamountccy,buyorderamount,sellorderamountccy,custcomment,sellorderamount,recipient,nOffers,'+
                          'buysell, buysellbank,freq,freqnum,startdate from Forwardorders m left outer join v_forwardoffers v on m.orderid=v.orderidfk where m.currentstatus in (?) and recipient = ? ',['N',username], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

      app.get('/get_bank_orders_mm/:username', function(req,res){
            var username = req.params.username;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select distinct orderid,orderindex,usernamefk,ccy,orderamount,mmfrom,mmto,tenuredays,custcomment,ordertypefk,mmtype,mmtypebank,nOffers '+
                          'from Moneymarketorders m left outer join v_mmorders v on m.orderid=v.orderidfk where m.currentstatus in (?) and usernamefk = ? ',['N','dealer1@customer1.com'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_s_mm_offer', function(req,res){
            console.log(req.query);
            var orderidfk = req.query.orderid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select offerid,orderidfk,fixedrate,ccy,m.orderamount,daycount,totalinterest,tax,netinterest,offeredby,offerdate,orderdate,usernamefk,mmfrom,mmto,tenuredays,recipient,mmtype,recipient,bankcomment,custcomment,ordertypefk '+
                          'from offers_mm o left outer join Moneymarketorders m on o.orderidfk=m.orderid where orderidfk = ? ',[orderidfk], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_mm_offer', function(req,res){
            var offerid = req.query.id;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,m.orderindex,fixedrate,daycount,totalinterest,tax,netinterest,offeredby,offerdate,status,usernamefk,mmtypebank,'+
                        'orderdate,mmfrom,mmto,mmtype,m.orderamount,orderdate,ccy,bankcomment,tenuredays,recipient,custcomment,ordertypefk,currentstatus, m.orderamount+totalinterest-tax netamount,'+
                        'm.orderamount+totalinterest maturityamount from offers_mm o left outer join Moneymarketorders m on o.orderidfk=m.orderid where offerid = ? ',[offerid], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/accepted_mm_offers', function(req,res){
            var offeredby = req.query.offeredby;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,fixedrate,daycount,totalinterest,tax,netinterest,offeredby,offerdate,status,usernamefk,'+
                        'orderdate,mmfrom,mmto,mmtype,mmtypebank,m.orderamount,orderdate,ccy,bankcomment,tenuredays,recipient,custcomment,ordertypefk,currentstatus,bankuser '+
                        'from offers_mm o left outer join Moneymarketorders m on o.orderidfk=m.orderid where status=? and confirm=? and offeredby=? ',['Accepted','Pending',offeredby], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_mm_order/:orderindex', function(req,res){
            var orderindex = req.params.orderindex;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select orderindex,orderid,usernamefk,ccy,orderdate,orderamount,mmfrom,mmto,custname,tenuredays,recipient,currentstatus,custcomment,ordertypefk,mmtype,mmtypebank '+
                          'from Moneymarketorders where orderindex = ? ',[orderindex], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });


        app.get('/confirmed_mm_offer', function(req,res){
            var orderindex = req.params.orderindex;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,fixedrate,Moneymarketorders.orderamount,daycount,totalinterest,tax,netinterest,bankcomment,offeredby,usernamefk'+
                        ',ccy,orderdate,offerdate,orderid,mmto,mmfrom,recipient, custcomment,ordertypefk,tenuredays,mmtype,mmtypebank,currentstatus,confirm,status '+
                        'from offers_mm left join Moneymarketorders on offers_mm.orderidfk = Moneymarketorders.orderid where status = ? and confirm IN (?,?) and recipient=offeredby ',['Accepted','Confirmed','Confirmed-Paid'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/all_mm_offers', function(req,res){
            console.log(req.query);
            var domain = req.query.domain;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,Moneymarketorders.orderindex,orderidfk,fixedrate,Moneymarketorders.orderamount,daycount,totalinterest,tax,netinterest,bankcomment,offeredby,usernamefk'+
                        ',ccy,orderdate,offerdate,orderid,mmto,mmfrom,recipient, custcomment,ordertypefk,tenuredays,mmtype,mmtypebank,currentstatus,mmtype,mmtypebank '+
                        'from offers_mm left join Moneymarketorders on offers_mm.orderindex = Moneymarketorders.orderindex where offeredby = ? and status = ? ',[domain,'Open'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });
                        

        app.get('/payments_mm_confirm', function(req,res){
            var orderindex = req.params.orderindex;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,fixedrate,daycount,totalinterest,tax,netinterest,offeredby,offerdate,status,usernamefk,mmtype,mmtypebank'+
                        ',orderdate,mmfrom,mmto,Moneymarketorders.orderamount,orderdate,ccy,bankcomment,tenuredays,recipient,custcomment,ordertypefk,currentstatus, Moneymarketorders.orderamount+totalinterest-tax netamount '+
                        'from offers_mm left outer join Moneymarketorders on offers_mm.orderidfk = Moneymarketorders.orderid where status = ? and confirm = ? ',['Accepted','Confirmed'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/payments_swap_confirm', function(req,res){
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,nearspot,nearmargin,nearfinal,offers_swap.neardate,offeredby,offers_swap.fardate,offers_swap.nearbuyorderamountccy,offers_swap.nearbuyorderamount,offers_swap.nearsellorderamountccy,offers_swap.nearsellorderamount,usernamefk'+
                        ',ccypair,orderdate,farfinal,buysell,buysellbank,currentstatus,recipient,ordertypefk,status,if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) recbank,'+
                        'if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) paybank,offers_swap.farbuyorderamount,offers_swap.farbuyorderamountccy,offers_swap.farsellorderamountccy,offers_swap.farsellorderamount '+
                        'from offers_swap left join Swaporders on offers_swap.orderindex = Swaporders.orderindex where status = ? and confirm = ? ',['BUY','REC','SELL','REC','PAY','BUY','PAY','SELL','PAY','REC','Accepted','Confirmed'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_s_swap_offer', function(req,res){
            var orderidfk = req.query.id;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,nearspot,nearmargin,nearfinal,Swaporders.neardate,offeredby,offers_swap.nearbuyorderamountccy,offers_swap.nearbuyorderamount,offers_swap.nearsellorderamountccy,offers_swap.nearsellorderamount,createdate,usernamefk'+
                        ',ccypair,orderdate,farspot,farmargin,farfinal,buysell,offers_swap.farbuyorderamount,offers_swap.farbuyorderamountccy,offers_swap.farsellorderamountccy,offers_swap.farsellorderamount,recipient,comment,custcomment,ordertypefk,Swaporders.fardate '+
                        'from offers_swap left outer join Swaporders on offers_swap.orderidfk = Swaporders.orderid where orderidfk =? ',[orderidfk], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_s_swap_offer_bank', function(req,res){
            var offerid = req.query.offerid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,nearspot,nearmargin,nearfinal,Swaporders.neardate,offeredby,offers_swap.nearbuyorderamountccy,offers_swap.nearbuyorderamount,offers_swap.nearsellorderamountccy,offers_swap.nearsellorderamount,createdate,usernamefk'+
                        ',ccypair,orderdate,farspot,farmargin,farfinal,buysell,buysellbank,offers_swap.farbuyorderamount,offers_swap.farbuyorderamountccy,offers_swap.farsellorderamountccy,offers_swap.farsellorderamount,recipient,comment,custcomment,ordertypefk,Swaporders.fardate '+
                        'from offers_swap left outer join Swaporders on offers_swap.orderidfk = Swaporders.orderid where offerid =? ',[offerid], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/to_confirm_offers_swap', function(req,res){
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,nearspot,nearmargin,nearfinal,offers_swap.neardate,offeredby,offers_swap.fardate,offers_swap.nearbuyorderamountccy,offers_swap.nearbuyorderamount,offers_swap.nearsellorderamountccy,offers_swap.nearsellorderamount,usernamefk'+
                        ',ccypair,orderdate,farfinal,buysell,buysellbank,currentstatus,recipient,ordertypefk,status,if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) recbank,'+
                        'if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) paybank,offers_swap.farbuyorderamount,offers_swap.farbuyorderamountccy,offers_swap.farsellorderamountccy,offers_swap.farsellorderamount '+
                        'from offers_swap left outer join Swaporders on offers_swap.orderidfk = Swaporders.orderid where status = ? and confirm = ? and recipient = offeredby',['BUY','REC','SELL','REC','PAY','BUY','PAY','SELL','PAY','REC','Accepted','Sent'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_swap_offer', function(req,res){
            var offerid = req.query.offerid;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,nearspot,nearmargin,nearfinal,Swaporders.neardate,offeredby,offers_swap.nearbuyorderamountccy,offers_swap.nearbuyorderamount,offers_swap.nearsellorderamountccy,offers_swap.nearsellorderamount,createdate,usernamefk'+
                        ',ccypair,orderdate,farspot,farmargin,farfinal,buysell,offers_swap.farbuyorderamount,offers_swap.farbuyorderamountccy,offers_swap.farsellorderamountccy,offers_swap.farsellorderamount,recipient,comment,custcomment,ordertypefk,Swaporders.fardate,'+
                        'if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) recbank,'+
                        'if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) paybank '+
                        'from offers_swap left outer join Swaporders on offers_swap.orderidfk = Swaporders.orderid where offerid =?',['BUY','REC','SELL','REC','PAY','BUY','PAY','SELL','PAY','REC',offerid], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });//

        app.get('/confirmed_swap_offers', function(req,res){
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,nearspot,nearmargin,nearfinal,offers_swap.neardate,offeredby,offers_swap.fardate,offers_swap.nearbuyorderamountccy,offers_swap.nearbuyorderamount,offers_swap.nearsellorderamountccy,offers_swap.nearsellorderamount,usernamefk'+
                        ',ccypair,orderdate,farfinal,buysell,buysellbank,currentstatus,recipient,ordertypefk,status,if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) recbank,'+
                        'if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) paybank,offers_swap.farbuyorderamount,offers_swap.farbuyorderamountccy,offers_swap.farsellorderamountccy,offers_swap.farsellorderamount '+
                        'from offers_swap left join Swaporders on offers_swap.orderidfk = Swaporders.orderid where status = ? and confirm IN (?,?) and recipient=offeredby',['BUY','REC','SELL','REC','PAY','BUY','PAY','SELL','PAY','REC','Accepted','Confirmed', 'Confirmed-Paid'], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/accepted_swap_offers', function(req,res){
            var domain = req.query.username;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,nearspot,nearmargin,nearfinal,offers_swap.neardate,offeredby,offers_swap.fardate,offers_swap.nearbuyorderamountccy,offers_swap.nearbuyorderamount,offers_swap.nearsellorderamountccy,offers_swap.nearsellorderamount,usernamefk'+
                        ',ccypair,orderdate,farfinal,buysell,buysellbank,currentstatus,recipient,ordertypefk,status,if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) recbank,'+
                        'if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) paybank,offers_swap.farbuyorderamount,offers_swap.farbuyorderamountccy,offers_swap.farsellorderamountccy,offers_swap.farsellorderamount '+
                        'from offers_swap left join Swaporders on offers_swap.orderindex = Swaporders.orderindex where status = ? and confirm = ? and offeredby =? ',['BUY','REC','SELL','REC','PAY','BUY','PAY','SELL','PAY','REC','Accepted','Pending',domain], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/all_swap_offers', function(req,res){
            console.log(req.query.username);
            var username = req.query.username;
            connectionpool.getConnection(function(err, connection) {
                    connection.query(
                        'select offerid,orderidfk,nearspot,nearmargin,nearfinal,offers_swap.neardate,offeredby,offers_swap.fardate,offers_swap.nearbuyorderamountccy,offers_swap.nearbuyorderamount,offers_swap.nearsellorderamountccy,offers_swap.nearsellorderamount,usernamefk'+
                        ',ccypair,orderdate,farfinal,buysell,buysellbank,currentstatus,recipient,ordertypefk,status,if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) recbank,'+
                        'if(buysell=? AND offers_swap.nearbuyorderamount>0,?,if(buysell=? AND offers_swap.nearsellorderamount>0,?,?)) paybank,offers_swap.farbuyorderamount,offers_swap.farbuyorderamountccy,offers_swap.farsellorderamountccy,offers_swap.farsellorderamount '+
                        'from offers_swap left join Swaporders on offers_swap.orderindex = Swaporders.orderindex where status = ? and bankuser =? ',['BUY','REC','SELL','REC','PAY','BUY','PAY','SELL','PAY','REC','Open',username], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });

        app.get('/get_a_currency/:ccy', function(req,res){
            var ccy = req.params.ccy;
            connectionpool.getConnection(function(err, connection) {
                    connection.query('select code,ccydesc,intdays '+
                          'from currencies where code = ? ',[ccy], function(err, rows, fields) {
                        if (err) {
                            console.error(err);
                            res.statusCode = 500;
                            res.send({
                                result: 'error',
                                err:    err.code
                            });
                        }
                        res.send({
                            result: 'success',
                            data:   rows,
                            length: rows.length
                        });
                        connection.release();
                    });
            });
        });
//
      app.post('/new_swap_offer', function(req,res){
        console.log('Data to be saved ...',req.body);
        var orderindex = req.body.orderindex;
        var orderidfk = req.body.orderidfk;
        var nearspotrate = req.body.nearspotrate;
        var nearmargin = req.body.nearmargin;
        var nearspot = req.body.nearspot;
        var nearfinal = req.body.nearfinal;
        var nearbuyorderamountccy = req.body.nearbuyorderamountccy;
        var nearbuyorderamount = req.body.nearbuyorderamount;
        var nearsellorderamountccy = req.body.nearsellorderamountccy;
        var nearsellorderamount = req.body.nearsellorderamount;
        var neardate = req.body.neardate;
        var farspot = req.body.farspot;
        var farmargin = req.body.farmargin;
        var farfinal = req.body.farfinal;
        var farbuyorderamountccy = req.body.farbuyorderamountccy;
        var farbuyorderamount = req.body.farbuyorderamount;
        var farsellorderamountccy = req.body.farsellorderamountccy;
        var farsellorderamount = req.body.farsellorderamount;
        var fardate = req.body.fardate;
        var comment = req.body.comment;
        var offeredby = req.body.offeredby;
        var bankuser = req.body.bankuser;
       

          connectionpool.getConnection(function(err, connection) {
                  connection.query('insert into offers_swap(orderindex,orderidfk,nearspot,nearmargin,nearfinal,nearbuyorderamountccy,nearbuyorderamount,nearsellorderamountccy,nearsellorderamount,neardate,farspot,farmargin,farfinal,farbuyorderamountccy,farbuyorderamount,farsellorderamountccy,farsellorderamount,fardate,comment,offeredby,bankuser)'+ 
                      'values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                      [orderindex,orderidfk,nearspot,nearmargin,nearfinal,nearbuyorderamountccy,nearbuyorderamount,nearsellorderamountccy,nearsellorderamount,neardate,farspot,farmargin,farfinal,farbuyorderamountccy,farbuyorderamount,farsellorderamountccy,farsellorderamount,fardate,comment,offeredby,bankuser], 
                      function(err, rows, fields) {
                      if (err) {
                          console.error(err);
                          res.statusCode = 500;
                          res.send({
                              result: 'error',
                              err:    err.code
                          });
                      }
                      res.send({
                          result: 'success',
                          data:   'New Swap offer successfully Made',
                      });
                      connection.release();
                      io.emit('new swap offer', {title:'MM Offer',buysell:'Swaporder',ccypair:'Swaporder',usernamefk:'customername'});
                  });
          });
      });

app.post('/new_forward_offer', function(req,res){
        console.log('Data to be saved ...',req.body);
        var orderindex = req.body.orderindex;
        var orderidfk = req.body.orderidfk;
        var spot = req.body.spot;
        var margin = req.body.margin;
        var finalrate = req.body.finalrate;
        var settlementamountccy = req.body.settlementamountccy;
        var settlementamount = req.body.settlementamount;
        var settlementdate = req.body.settlementdate;
        var bankcomment = req.body.bankcomment;
        var orderindex = req.body.orderindex;
        var offeredby = req.body.offeredby;
        var bankuser = req.body.bankuser;
       

          connectionpool.getConnection(function(err, connection) {
                  connection.query('insert into offers_forward(orderindex,orderidfk,spot,margin,finalrate,settlementamountccy,settlementamount,settlementdate,bankcomment,offeredby,bankuser)'+ 
                      'values(?,?,?,?,?,?,?,?,?,?,?)', 
                      [orderindex,orderidfk,spot,margin,finalrate,settlementamountccy,settlementamount,settlementdate,bankcomment,offeredby,bankuser], 
                      function(err, rows, fields) {
                      if (err) {
                          console.error(err);
                          res.statusCode = 500;
                          res.send({
                              result: 'error',
                              err:    err.code
                          });
                      }
                      res.send({
                          result: 'success',
                          data:   'New Forward offer successfully Made',
                      });
                      connection.release();
                      io.emit('new forward offer', {title:'Forward Offer',buysell:'Forward offer',ccypair:'New Offer',usernamefk:bankuser});
                  });
          });
      });

//

app.post('/add_forward_order', function(req,res){
    //console.log('Data to be saved ...',req.body);
        var orderid = req.body.orderid;
        var forwardid = req.body.forwardid;
        var usernamefk = req.body.usernamefk;
        var ccypair = req.body.ccypair;
        var buyorderamountccy = req.body.buyorderamountccy;
        var buyorderamount = req.body.buyorderamount;
        var sellorderamountccy = req.body.sellorderamountccy;
        var sellorderamount = req.body.sellorderamount;
        var buysell = req.body.buysell;
        var buysellbank = req.body.buysellbank;
        var recipient = req.body.recipient;
        var custcomment = req.body.custcomment;
        var ordertypefk = req.body.ordertypefk;
        var freq = req.body.freq;
        var freqnum = req.body.freqnum;
        var startdate = req.body.startdate;
       

          connectionpool.getConnection(function(err, connection) {
                  connection.query('insert into Forwardorders(orderid,forwardid,usernamefk,ccypair,buyorderamountccy,buyorderamount,sellorderamountccy,sellorderamount,buysell,buysellbank,recipient,custcomment,ordertypefk,freq,freqnum,startdate) values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                    [orderid,forwardid,usernamefk,ccypair,buyorderamountccy,buyorderamount,sellorderamountccy,sellorderamount,buysell,buysellbank,recipient,custcomment,ordertypefk,freq,freqnum,startdate],
                      //
                      function(err, rows, fields) {
                      if (err) {
                          console.error(err);
                          res.statusCode = 500;
                          res.send({
                              result: 'error',
                              err:    err.code
                          });
                      }
                      res.send({
                          result: 'success',
                          data:   'New Forward order successfully Made'
                      });
                      connection.release();
                      io.emit('new forward order', {title:'Forward order',buysell:buysell,ccypair:ccypair,usernamefk:usernamefk});
                  });
          });
      });
//
      app.post('/new_mm_offer', function(req,res){
        console.log('Data to be saved ...',req.body);
        var orderindex = req.body.orderindex;
        var orderidfk = req.body.orderidfk;
        var fixedrate = req.body.fixedrate;
        var orderamount = req.body.orderamount;
        var daycount = req.body.daycount;
        var totalinterest = req.body.totalinterest;
        var tax = req.body.tax;
        var netinterest = req.body.netinterest;
        var bankcomment = req.body.bankcomment;
        var offeredby = req.body.offeredby;
        var bankuser = req.body.bankuser;
       
 
          connectionpool.getConnection(function(err, connection) {
                  connection.query('insert into offers_mm(orderindex,orderidfk,fixedrate,orderamount,daycount,totalinterest,tax,netinterest,bankcomment,offeredby,bankuser)'+ 
                      'values(?,?,?,?,?,?,?,?,?,?,?)', 
                      [orderindex,orderidfk,fixedrate,orderamount,daycount,totalinterest,tax,netinterest,bankcomment,offeredby,bankuser], 
                      function(err, rows, fields) {
                      if (err) {
                          console.error(err);
                          res.statusCode = 500;
                          res.send({
                              result: 'error',
                              err:    err.code
                          });
                      }
                      res.send({
                          result: 'success',
                          data:   'New MM offer successfully Made',
                      });
                      connection.release();
                      io.emit('new mm offer', {title:'MM Offer',buysell:'Swaporder',ccypair:'Swaporder',usernamefk:'customername'});
                  });
          });
      });

    app.post('/updateordermm', function(req, res){
      var orderindex = req.body.orderindex;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update Moneymarketorders set currentstatus = ? where orderindex = ?' ,['OfferReceived',orderindex], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'updateordermm successful',
                });
                connection.release();
            });
      });
    });

    app.post('/updateordermmreverse', function(req, res){
      var orderindex = req.body.orderindex;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update Moneymarketorders set currentstatus = ? where orderindex = ?' ,['N',orderindex], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'updateordermmreverse successful',
                });
                connection.release();
            });
      });
    });

    app.post('/ammend_mm_offer', function(req, res){
      var fixedrate = req.body.fixedrate;
      var totalinterest = req.body.totalinterest;
      var tax = req.body.tax;
      var netinterest = req.body.netinterest;
      var bankcomment = req.body.bankcomment;
      var offerid = req.body.offerid;

      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_mm set fixedrate=?,totalinterest=?,tax=?,netinterest=?,bankcomment=? where offerid = ?' ,[fixedrate,totalinterest,tax,netinterest,bankcomment,offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'updateordermmreverse successful',
                });
                connection.release();
            });
      });
    });

    app.post('/updateorderreverse', function(req, res){
      var orderindex = req.body.orderindex;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update spotorders set currentstatus = ? where orderindex = ?' ,['N',orderindex], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'updateordermmreverse successful',
                });
                connection.release();
            });
      });
    });

    app.post('/updateorderswapreverse', function(req, res){
      var orderindex = req.body.orderindex;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update Swaporders set currentstatus = ? where orderindex = ?' ,['N',orderindex], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'updateordermmreverse successful',
                });
                connection.release();
            });
      });
    });

    app.post('/updateorderforwardreverse', function(req, res){
      var orderindex = req.body.orderindex;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update Forwardorders set currentstatus = ? where orderindex = ?' ,['N',orderindex], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'updateordermmreverse successful',
                });
                connection.release();
            });
      });
    });

    app.post('/accept_swap_deal', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_swap set confirm = ? where offerid = ?' ,['Confirmed',offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_swap_deal successful',
                });
                connection.release();
            });
      });
    });

    app.post('/update_forward_offer', function(req, res){
      var offerid = req.body.offerid;
      var spot = req.body.spot;
      var margin = req.body.margin;
      var settlementamountccy = req.body.settlementamountccy;
      var settlementamount = req.body.settlementamount;
      var bankcomment = req.body.bankcomment;
      var finalrate = req.body.finalrate;

      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_forward set spot = ?,margin=?,finalrate=?,settlementamountccy=?,settlementamount=?,bankcomment=? where offerid = ?' ,[spot,margin,finalrate,settlementamountccy,settlementamount,bankcomment,offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'update_forward_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/delete_mm_offer', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('delete from offers_mm where offerid = ?' ,[offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'delete_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/delete_swap_offer', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('delete from offers_swap where offerid = ?' ,[offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'delete_swap_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/delete_forward_offer', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('delete from offers_forward where offerid = ?' ,[offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'delete_forward_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/delete_spot_offer', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('delete from offers where offerid = ?' ,[offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'delete_spot_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/edit_spot_offer', function(req, res){
        console.log(req.body);
      var offerid = req.body.offerid;
      var spotrate = req.body.spotrate;
      var magin = req.body.magin;
      var settleamount = req.body.settleamount;
      var offeredrate = req.body.offeredrate;
      var offercomment = req.body.offercomment;

      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers set spotrate=?,magin=?,settleamount=?,offeredrate=?,offercomment=? '+
              'where offerid = ? '
               ,[spotrate,magin,settleamount,offeredrate,offercomment,offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'edit_spot_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/edit_swap_offer', function(req, res){
        console.log(req.body);
      var nearspot = req.body.nearspot;
      var nearmargin = req.body.nearmargin;
      var nearfinal = req.body.nearfinal;
      var nearbuyorderamount = req.body.nearbuyorderamount;
      var nearsellorderamount = req.body.nearsellorderamount;
      var farspot = req.body.farspot;
      var farmargin = req.body.farmargin;
      var farfinal = req.body.farfinal;
      var farbuyorderamount = req.body.farbuyorderamount;
      var farsellorderamount = req.body.farsellorderamount;
      var offerid = req.body.offerid;

      connectionpool.getConnection(function(err, connection) {
            connection.query(
                'Update offers_swap set nearspot=?,nearmargin=?,nearfinal=?,nearbuyorderamount=?,nearsellorderamount=?,'+
                'farspot=?, farmargin=?, farfinal=?, farbuyorderamount=?, farsellorderamount=? where offerid = ? '
               ,[nearspot,nearmargin,nearfinal,nearbuyorderamount,nearsellorderamount,farspot,farmargin,farfinal,farbuyorderamount,farsellorderamount,offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'edit_swap_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/confirm_swap_offer', function(req, res){
      var offerid = req.body.offerid;
      var date = req.body.date;

      connectionpool.getConnection(function(err, connection) {
            connection.query('update offers_swap set confirm=?, confirmdate=? where offerid=?' ,['Sent',date,offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'confirm_swap_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/updateorderswap', function(req, res){
      var orderindex = req.body.orderindex;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update Swaporders set currentstatus = ? where orderid = ?' ,['OfferReceived',orderindex], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'updateordermm successful',
                });
                connection.release();
            });
      });
    });


    app.post('/accept_swap_offer', function(req, res){
      var orderid = req.body.orderid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update Swaporders set currentstatus = ? where orderid = ?' ,['Taken',orderid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_swap_offer successful',
                });
                connection.release();
                io.emit('accepted offer')
            });
      });
    });

    app.post('/accept_swap_offer2', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_swap set status = ? where offerid = ?' ,['Accepted',offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_swap_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/accept_mm_offer', function(req, res){
      var offerid = req.body.offerid;
      console.log('accept_mm_offer', req.body);
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_mm set status = ? where offerid = ?' ,['Accepted',offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_mm_offer successful',
                });
                connection.release();
                io.emit('accepted offer')
            });
      });
    });

    app.post('/confirm_mm_offer', function(req, res){
      var offerid = req.body.offerid;
      var date = req.body.date;
      console.log('confirm_mm_offer', req.body);
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_mm set confirm = ?, confirmdate=? where offerid = ?' ,['Sent',date,offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'confirm_mm_offer successful',
                });
                connection.release();
            });
      });
    });

    app.post('/accept_mm_offer2', function(req, res){
      var orderid = req.body.orderid;
      console.log('accept_mm_offer2', req.body);
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update Moneymarketorders set currentstatus = ? where orderid = ?' ,['Taken',orderid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_mm_offer2 successful',
                });
                connection.release();
            });
      });
    });


    app.post('/accept_mm_deal', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_mm set confirm = ? where offerid = ?' ,['Confirmed',offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_mm_deal successful',
                });
                connection.release();
            });
      });
    });
    
    app.post('/spotorders', function(req,res){
    	//console.log('Data to be saved ...',req.body);
    	var orderid = req.body.orderid;
      var usernamefk = req.body.usernamefk;
      var ccypair = req.body.ccypair;
      var buyorderamount = req.body.buyorderamount;
  		var sellorderamount = req.body.sellorderamount;
  		var buysell = req.body.buysell;
  		var buysellbank = req.body.buysellbank;
  		var recipient = req.body.recipient;
  		var settlementdate = req.body.settlementdate;
  		var custcomment = req.body.custcomment;
  		var ordertypefk = req.body.ordertypefk;
  		var ccysellorderamount = req.body.ccysellorderamount;
  		var ccybuyorderamount = req.body.ccybuyorderamount;
  		
  		if(buyorderamount == ''){
  			buyorderamount = '0';
  		}else if(sellorderamount ==''){
  			sellorderamount = '0'
  		}

        connectionpool.getConnection(function(err, connection) {
                connection.query('insert into spotorders(orderid,usernamefk,ccypair,buyorderamount,sellorderamount,buysell,buysellbank,recipient,settlementdate,custcomment,ordertypefk,ccysellorderamount,ccybuyorderamount)'+ 
                		'values(?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                		[orderid,usernamefk,ccypair,buyorderamount,sellorderamount,buysell,buysellbank,recipient,settlementdate,custcomment,ordertypefk,ccysellorderamount,ccybuyorderamount], 
                		function(err, rows, fields) {
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
                    res.send({
                        result: 'success',
                        data:   'New Spotorder successfully Inserted',
                    });
                    connection.release();
                    io.emit('ticket', {title:'New spotorder',buysell:buysell,ccypair:ccypair,usernamefk:usernamefk});
                    console.log("Socket.io is GO");
                });
        });
    });

  app.post('/add_swap_order', function(req,res){
      console.log('Data to be saved ...',req.body);
      var orderid = req.body.orderid;
      var usernamefk = req.body.usernamefk;
      var ccypair = req.body.ccypair;
      var nearbuyorderamountccy = req.body.nearbuyorderamountccy;
      var nearbuyorderamount = req.body.nearbuyorderamount;
      var nearsellorderamountccy = req.body.nearsellorderamountccy;
      var nearsellorderamount = req.body.nearsellorderamount;
      var buysell = req.body.buysell;
      var buysellbank = req.body.buysellbank;
      var recipient = req.body.recipient;
      var neardate = req.body.neardate;
      var fardate = req.body.fardate;
      var farbuyorderamountccy = req.body.farbuyorderamountccy;
      var farbuyorderamount = req.body.farbuyorderamount;
      var farsellorderamountccy = req.body.farsellorderamountccy;
      var farsellorderamount = req.body.farsellorderamount;
      var custcomment = req.body.custcomment;
      var ordertypefk = req.body.ordertypefk;
      
      if(nearbuyorderamount == ''){
        nearbuyorderamount = '0';
      }
      if(nearsellorderamount ==''){
        nearsellorderamount = '0'
      }
      if(farbuyorderamount ==''){
        farbuyorderamount = '0'
      }
      if(farsellorderamount ==''){
        farsellorderamount = '0'
      }
      
//
        connectionpool.getConnection(function(err, connection) {
                connection.query('insert into Swaporders(orderid,usernamefk,ccypair,nearbuyorderamountccy,nearbuyorderamount,nearsellorderamountccy,nearsellorderamount,buysell,buysellbank,recipient,neardate,fardate,farbuyorderamountccy,farbuyorderamount,farsellorderamountccy,farsellorderamount,custcomment,ordertypefk,currentstatus)'+ 
                    'values(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                    [orderid,usernamefk,ccypair,nearbuyorderamountccy,nearbuyorderamount,nearsellorderamountccy,nearsellorderamount,buysell,buysellbank,recipient,neardate,fardate,farbuyorderamountccy,
                    farbuyorderamount,farsellorderamountccy,farsellorderamount,custcomment,ordertypefk,'N'], function(err, rows, fields) {
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
                    res.send({
                        result: 'success',
                        data:   'New Swaporder successfully Inserted',
                    });
                    connection.release();
                    io.emit('new swap order', {title:'New swaporder',buysell:buysell,ccypair:ccypair,usernamefk:usernamefk});
                });
        });
    });

  app.post('/add_mm', function(req,res){
      console.log('Data to be saved ...',req.body);
      var orderid = req.body.orderid;
      var usernamefk = req.body.usernamefk;
      var ccy = req.body.ccy;
      var orderamount = req.body.orderamount;
      var mmfrom = req.body.mmfrom;
      var mmto = req.body.mmto;
      var tenure = req.body.tenure;
      var recipient = req.body.recipient;
      var custcomment = req.body.custcomment;
      var ordertypefk = req.body.ordertypefk;
      var mmtype = req.body.mmtype;
      var mmtypebank = req.body.mmtypebank;
      var custname = req.body.custname;
      // 

        connectionpool.getConnection(function(err, connection) {
                connection.query('insert into Moneymarketorders(orderid,usernamefk,ccy,orderamount,mmfrom,mmto,tenuredays,recipient,custcomment,ordertypefk,mmtype,mmtypebank,custname)'+ 
                    'values(?,?,?,?,?,?,?,?,?,?,?,?,?)', 
                    [orderid,usernamefk,ccy,orderamount,mmfrom,mmto,tenure,recipient,custcomment,ordertypefk,mmtype,mmtypebank,custname], function(err, rows, fields) {
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
                    res.send({
                        result: 'success',
                        data:   'New Swaporder successfully Inserted',
                    });
                    connection.release();
                    io.emit('new mm order', {title:'New MM Order',buysell:mmtype,ccypair:ccy,usernamefk:usernamefk});
                });
        });
    });
    
    //----> new offer 
    app.post('/new_offer', function(req,res){
    	//console.log('Data to be saved ...',req.body);
    	var orderindex = req.body.orderindex;
        var orderidfk = req.body.orderidfk;
        var spotrate = req.body.spotrate;
        var magin = req.body.magin;
  		var offeredrate = req.body.offeredrate;
  		var offeredby = req.body.offeredby;
  		var ccysettleamount = req.body.ccysettleamount;
  		var settleamount = req.body.settleamount;
  		var offercomment = req.body.offercomment;
  		var settlementdate = req.body.settlementdate;
  		var bankuser = req.body.bankuser;
  		
        connectionpool.getConnection(function(err, connection) {
                connection.query('insert into offers(orderindex,orderidfk,spotrate,magin,offeredrate,settlementdate,offeredby,ccysettleamount,settleamount,offercomment,bankuser)'+ 
                		'values(?,?,?,?,?,?,?,?,?,?,?)', 
                		[orderindex,orderidfk,spotrate,magin,offeredrate,settlementdate,offeredby,ccysettleamount,settleamount,offercomment,bankuser], 
                		function(err, rows, fields) {
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
                    res.send({
                        result: 'success',
                        data:   'New offer successfully made',
                    });
                    connection.release();
                    io.emit('new spot offer', 'New Offer Made');
                });
        });
    });
    
    
    //---> update order  
    app.post('/updateorder', function(req, res){
    	var orderindex = req.body.orderindex;
    	connectionpool.getConnection(function(err, connection) {
            connection.query('Update spotorders set currentstatus = ? where orderindex = ?' ,['OfferReceived',orderindex], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'New offer successfully made',
                });
                connection.release();
            });
    	});
    });

    app.post('/updateforwardorder', function(req, res){
        console.log(req.body);
        var orderindex = req.body.orderindex;
        connectionpool.getConnection(function(err, connection) {
            connection.query('Update Forwardorders set currentstatus = ? where orderindex = ?' ,['OfferReceived',orderindex], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'Forwardorders updated',
                });
                connection.release();
            });
        });
    });

    app.post('/accept_deal', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers set confirm = ? where offerid = ?' ,['Confirmed',offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_deal ok',
                });
                connection.release();
                io.emit('accept_spot_deal', {title:'Deal accepted'});
            });
      });
    });

    app.post('/accept_forward_deal', function(req, res){
      var offerid = req.body.offerid;
      connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_forward set confirm = ? where offerid = ?' ,['Confirmed',offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_forward_deal ok',
                });
                connection.release();
                io.emit('accept_forward_deal', {title:'Deal accepted'});
            });
      });
    });
    
    app.post('/accept_offer', function(req, res){
    	var offerid = req.body.offerid;
    	connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers set status = ? where offerid = ?' ,['Accepted',offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_offer ok',
                });
                connection.release();
                io.emit('accepted offer');
            });
    	});
    });

    app.post('/accept_forward_offer', function(req, res){
        var offerid = req.body.offerid;
        connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_forward set status = ? where offerid = ?' ,['Accepted',offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_forward_offer ok',
                });
                connection.release();
                io.emit('accepted offer');
            });
        });
    });
    
    app.post('/accept_offer1', function(req, res){
    	var orderid = req.body.orderid;
    	connectionpool.getConnection(function(err, connection) {
            connection.query('Update spotorders set currentstatus = ? where orderid = ?' ,['Taken',orderid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_offer1 ok',
                });
                connection.release();
            });
    	});
    });

    app.post('/accept_forward_offer1', function(req, res){
        var orderid = req.body.orderid;
        connectionpool.getConnection(function(err, connection) {
            connection.query('Update Forwardorders set currentstatus = ? where orderid = ?' ,['Taken',orderid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'accept_offer1 ok',
                });
                connection.release();
            });
        });
    });
    
    app.post('/confirm_offer', function(req, res){
    	var offerid = req.body.offerid;
    	var sysdate = req.body.sysdate;
    	console.log(offerid);
    	connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers set confirm = ?, confirmdate = ? where offerid = ?' ,['Sent',sysdate,offerid], function(err, rows, fields) {
            	if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'confirm_offer ok',
                });
                connection.release();
            });
    	});
    });

    app.post('/confirm_offer_forward', function(req, res){
        var offerid = req.body.offerid;
        var sysdate = req.body.sysdate;
        console.log(offerid);
        connectionpool.getConnection(function(err, connection) {
            connection.query('Update offers_forward set confirm = ?, confirmdate = ? where offerid = ?' ,['Sent',sysdate,offerid], function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.statusCode = 500;
                    res.send({
                        result: 'error',
                        err:    err.code
                    });
                }
                res.send({
                    result: 'success',
                    data:   'confirm_offer_forward ok',
                });
                connection.release();
            });
        });
    });
    
    app.get('/banks', function(req,res){
        connectionpool.getConnection(function(err, connection) {
                connection.query('select * from banks', function(err, rows, fields) {
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
                    res.send({
                        result: 'success',
                        data:   rows
                    });
                    connection.release();
                });
        });
    });
    
    app.get('/getanorder/:orderindex', function(req,res){
    	var orderindex = req.params.orderindex;
        connectionpool.getConnection(function(err, connection) {
                connection.query('select orderindex, orderid,usernamefk,ccypair,orderdate,sellorderamount+buyorderamount orderamount,sellorderamount,buyorderamount,buysell,buysellbank,currentstatus,'+
                	    'settlementdate,custcomment,ordertypefk from spotorders where orderindex = ?',[orderindex], function(err, rows, fields) {
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
                    res.send({
                        result: 'success',
                        data:   rows,
                        length: rows.length
                    });
                    connection.release();
                });
        });
    });
    
    app.get('/all_offers_test', function(req, res){
    	var username = req.query.id;
    	connectionpool.getConnection(function(err, connection) {
    		connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
    				'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=?,-3,if(buysell=? && buyorderamount>0,3,3)) limitnum,currentstatus,'+
    				'recipient,offercomment, custcomment,ordertypefk,status, if(buysell=? && sellorderamount>0,buyorderamount+sellorderamount,if(buysell=? && sellorderamount>0,buyorderamount+sellorderamount,settleamount)) buy_orderamount,'+
    				'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where bankuser = ? and status = ?',['SELL','BUY','BUY','SELL',username,'Open'],function(err, rows,field){
    			if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                }
                res.send({
    				data:rows
    			});
    			connection.release();
    		});
    	});
    });

    app.get('/all_offers_open', function(req, res){
        var username = req.query.id;
        connectionpool.getConnection(function(err, connection) {
            connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
                    'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=?,-3,if(buysell=? && buyorderamount>0,3,3)) limitnum,currentstatus,'+
                    'recipient,offercomment, custcomment,ordertypefk,status, if(buysell=? && sellorderamount>0,buyorderamount+sellorderamount,if(buysell=? && sellorderamount>0,buyorderamount+sellorderamount,settleamount)) buy_orderamount,'+
                    'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where bankuser = ? and status = ?',['SELL','BUY','BUY','SELL',username,'Open'],function(err, rows,field){
                if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                }
                res.send({
                    data:rows
                });
                connection.release();
            });
        });
    });

    app.get('/confirmed_offers', function(req, res){
      var id = req.param('id');
      connectionpool.getConnection(function(err, connection) {
        connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
            'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=?,3,-3) limitnum,currentstatus,'+
            'recipient,offercomment, custcomment,ordertypefk,status, if(buysellbank=? AND buyorderamount>0,?,?) recbank,if(buysellbank=? AND buyorderamount>0,?,?) paybank,'+
            'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where status = ? and confirm = ? and recipient=offeredby ',['BUY','BUY','REC','PAY','BUY','PAY','REC','Accepted','Confirmed'],function(err, rows,field){
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
          res.send({
            data:rows
          });
          connection.release();
        });
      });
    });

    app.get('/confirmed_forward_bo', function(req, res){
      connectionpool.getConnection(function(err, connection) {
        connection.query('select offerid,orderidfk,spot,margin,finalrate,o.settlementdate,f.startdate,offeredby,settlementamount,offeredby,'+
            'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buyorderamount>0,buyorderamountccy,sellorderamountccy) orderamountccy,currentstatus,'+
            'recipient,bankcomment, custcomment,ordertypefk,status, if(buysellbank=? AND buyorderamount>0,?,?) recbank,if(buysellbank=? AND buyorderamount>0,?,?) paybank,'+
            'usernamefk, freq,freqnum from offers_forward o left join Forwardorders f on o.orderindex = f.orderindex where status = ? and confirm = ? and recipient=offeredby ',['BUY','REC','PAY','BUY','PAY','REC','Accepted','Confirmed'],function(err, rows,field){
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
          res.send({
            data:rows
          });
          connection.release();
        });
      });
    });

    app.get('/confirmed_swap_offers', function(req, res){
      var id = req.param('id');
      connectionpool.getConnection(function(err, connection) {
        connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
            'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=?,3,-3) limitnum,currentstatus,'+
            'recipient,offercomment, custcomment,ordertypefk,status, if(buysellbank=? AND buyorderamount>0,?,?) recbank,if(buysellbank=? AND buyorderamount>0,?,?) paybank,'+
            'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where status = ? and confirm = ? and recipient=offeredby ',['BUY','BUY','REC','PAY','BUY','PAY','REC','Accepted','Confirmed'],function(err, rows,field){
          res.send({
            data:rows
          });
          connection.release();
        });
      });
    });
    
    app.get('/to_confirm_offers', function(req, res){
    	var id = req.param('id');
    	connectionpool.getConnection(function(err, connection) {
    		connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
    				'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=? AND buyorderamount>0,3,if(buysell=? AND sellorderamount>0,3,-3)) limitnum,currentstatus,'+
    				'recipient,offercomment, custcomment,ordertypefk,status, if(buysell=? AND buyorderamount>0,?,if(buysell=? AND buyorderamount>0,?,?)) recbank, if(buysell=? AND buyorderamount>0,?,if(buysell=? AND buyorderamount>0,?,?)) paybank,'+
    				'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where confirm = ? and status = ? and recipient = offeredby ',['BUY','SELL','BUY','REC','SELL','REC','PAY','BUY','PAY','SELL','PAY','REC','Sent','Accepted'],function(err, rows,field){
    			res.send({
    				data:rows
    			});
    			connection.release();
    		});
    	});
    });
//'BUY','REC','PAY','BUY','PAY','REC','Accepted','Sent','SELL'
    app.get('/to_confirm_forward', function(req, res){
        //var id = req.param('id');
        var id = req.query.id;
        connectionpool.getConnection(function(err, connection) {
            connection.query(
                    'select offerid,orderidfk,spot,margin,finalrate,o.settlementdate,offeredby,settlementamount,settlementamountccy,offerdate,offeredby,'+
                    'ccypair,orderdate,buysell,buysellbank,buyorderamount,sellorderamount,buyorderamount+sellorderamount orderamount,currentstatus,custcomment,ordertypefk,status'+
                    ',if(buyorderamount>0,buyorderamountccy,sellorderamountccy) orderamountccy,if(buysell=? AND buyorderamount>0,?,?) recbank,if(buysell=? AND buyorderamount>0,?,?) paybank,startdate,freqnum,freq,'+
                    'usernamefk from offers_forward o left join Forwardorders f on o.orderindex = f.orderindex where status = ? and confirm = ? and buysellbank = ? UNION '+
                    'select offerid,orderidfk,spot,margin,finalrate,o.settlementdate,offeredby,settlementamount,settlementamountccy,offerdate,offeredby,'+
                    'ccypair,orderdate,buysell,buysellbank,buyorderamount,sellorderamount,buyorderamount+sellorderamount orderamount,currentstatus,custcomment,ordertypefk,status'+
                    ',if(buyorderamount>0,buyorderamountccy,sellorderamountccy) orderamountccy,if(buysell=? AND buyorderamount>0,?,?) recbank,if(buysell=? AND buyorderamount>0,?,?) paybank,startdate,freqnum,freq,'+
                    'usernamefk from offers_forward o left join Forwardorders f on o.orderindex = f.orderindex where status = ? and confirm = ? and buysellbank = ?'

                    ,['BUY','REC','PAY','BUY','PAY','REC','Accepted','Sent','SELL','SELL','REC','PAY','SELL','PAY','REC','Accepted','Sent','BUY'],function(err, rows,field){
               
                res.send({
                    data:rows
                });
                connection.release();
            });
        });
    });
    
    app.get('/accepted_offers', function(req, res){
    	var username = req.param('id');
    	connectionpool.getConnection(function(err, connection) {
    		connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
    				'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=? AND buyorderamount>0,-3,3) limitnum,if(buysell=? AND sellorderamount>0,3,-3) limit_num,currentstatus,'+
    				'custcomment,ordertypefk,status,if(buysell=? AND buyorderamount>0,?,?) recbank,if(buysell=? AND buyorderamount>0,?,?) paybank,'+
    				'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where bankuser = ? and status = ? and confirm = ? and buysellbank = ?',['BUY','SELL','BUY','REC','PAY','BUY','PAY','REC',username,'Accepted','Pending','SELL'],function(err, rows,field){
    			res.send({
    				data:rows
    			});
    			connection.release();
    		});
    	});
    });
    
    app.get('/accepted_buy_offers', function(req, res){
    	var username = req.param('id');
    	connectionpool.getConnection(function(err, connection) {
    		connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
    				'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=? AND buyorderamount>0,-3,3) limitnum,currentstatus,'+
    				'custcomment,ordertypefk,status,if(buysell=? AND buyorderamount>0,?,?) recbank,if(buysell=? AND buyorderamount>0,?,?) paybank,'+
    				'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where bankuser = ? and status = ? and confirm = ? and buysellbank = ?',['SELL','SELL','REC','PAY','SELL','PAY','REC',username,'Accepted','Pending','BUY'],function(err, rows,field){
    			res.send({
    				data:rows
    			});
    			connection.release();
    		});
    	});
    });

    app.get('/accepted_forward_offers', function(req, res){
        var username = req.param('id');
        connectionpool.getConnection(function(err, connection) {
            connection.query(
                    'select offerid,orderidfk,spot,margin,finalrate,o.settlementdate,offeredby,settlementamount,settlementamountccy,offerdate,offeredby,'+
                    'ccypair,orderdate,buysell,buysellbank,buyorderamount,sellorderamount,buyorderamount+sellorderamount orderamount,currentstatus,custcomment,ordertypefk,status'+
                    ',if(buyorderamount>0,buyorderamountccy,sellorderamountccy) orderamountccy,if(buysell=? AND buyorderamount>0,?,?) recbank,if(buysell=? AND buyorderamount>0,?,?) paybank,startdate,freqnum,freq,'+
                    'usernamefk from offers_forward o left join Forwardorders f on o.orderindex = f.orderindex where bankuser = ? and status = ? and confirm = ? and buysellbank = ? UNION '+
                    
                    'select offerid,orderidfk,spot,margin,finalrate,o.settlementdate,offeredby,settlementamount,settlementamountccy,offerdate,offeredby,'+
                    'ccypair,orderdate,buysell,buysellbank,buyorderamount,sellorderamount,buyorderamount+sellorderamount orderamount,currentstatus,custcomment,ordertypefk,status'+
                    ',if(buyorderamount>0,buyorderamountccy,sellorderamountccy) orderamountccy,if(buysell=? AND buyorderamount>0,?,?) recbank,if(buysell=? AND buyorderamount>0,?,?) paybank,startdate,freqnum,freq,'+
                    'usernamefk from offers_forward o left join Forwardorders f on o.orderindex = f.orderindex where bankuser = ? and status = ? and confirm = ? and buysellbank = ?'
                    
                    ,['BUY','REC','PAY','BUY','PAY','REC',username,'Accepted','Pending','SELL','SELL','PAY','REC','SELL','REC','PAY',username,'Accepted','Pending','BUY'],function(err, rows,field){
                    if (err) {
                        console.error(err);
                        res.statusCode = 500;
                        res.send({
                            result: 'error',
                            err:    err.code
                        });
                    }
                res.send({
                    data:rows
                });
                connection.release();
            });
        });
    });

    app.get('/confirmed_swap_offers', function(req, res){
      var username = req.param('id');
      connectionpool.getConnection(function(err, connection) {
        connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
            'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=? AND buyorderamount>0,-3,3) limitnum,currentstatus,'+
            'custcomment,ordertypefk,status,if(buysell=? AND buyorderamount>0,?,?) recbank,if(buysell=? AND buyorderamount>0,?,?) paybank,'+
            'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where bankuser = ? and status = ? and confirm = ? and buysellbank = ?',['SELL','SELL','REC','PAY','SELL','PAY','REC',username,'Accepted','Pending','BUY'],function(err, rows,field){
          res.send({
            data:rows
          });
          connection.release();
        });
      });
    });

    app.get('/confirmed_mm_offers', function(req, res){
      var username = req.param('id');
      connectionpool.getConnection(function(err, connection) {
        connection.query('select offerid,orderidfk,spotrate,magin,offeredrate,spotorders.settlementdate,offeredby,settleamount,offerdate,offeredby,'+
            'ccypair,orderdate,buyorderamount+sellorderamount orderamount,buysell,buysellbank,if(buysell=? AND buyorderamount>0,-3,3) limitnum,currentstatus,'+
            'custcomment,ordertypefk,status,if(buysell=? AND buyorderamount>0,?,?) recbank,if(buysell=? AND buyorderamount>0,?,?) paybank,'+
            'usernamefk from offers left join spotorders on offers.orderindex = spotorders.orderindex where bankuser = ? and status = ? and confirm = ? and buysellbank = ?',['SELL','SELL','REC','PAY','SELL','PAY','REC',username,'Accepted','Pending','BUY'],function(err, rows,field){
          res.send({
            data:rows
          });
          connection.release();
        });
      });
    });


app.get('/currencies', function(req, res){
      connectionpool.getConnection(function(err, connection) {
        connection.query('select * from currencies ',[],function(err, rows,field){
          res.send({
            data:rows
          });
          connection.release();
        });
      });
    });

    

    // listen (start app with node server.js) ======================================
    //app.listen(port);
    http.listen(port, function(){
      console.log('Marginiq started on: http://127.0.0.1:' + port);
    });