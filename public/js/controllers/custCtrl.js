var app = angular.module('custCtrl', ['marginService'])

app.controller('indexcustCtrl', function($scope,$window,AuthService){
	$scope.username = window.sessionStorage.getItem("username");
	
	$scope.logout = function() {
	    AuthService.logout()
	    window.sessionStorage.clear()
	    $window.open('login.html','_self')
	};
})

app.controller('custCtrl', function($scope,$http,ordersService,socketio){
	$scope.username = window.sessionStorage.getItem("username")
	$scope.spotorders = [];
	$scope.custorders_mm = [];
	$scope.custorders_forward = [];

	spoto();
	mmorders();
	forwardorders();
	
	socketio.on('new mm offer', function(msg){
		mmorders();
	});

	socketio.on('new spot offer', function(msg){
		spoto();
	});

	socketio.on('new forward offer', function(msg){
		forwardorders();
	});
	
	function spoto(){
		$http({
		    url: '/spotorders/'+$scope.username, 
		    method: "GET",
		    headers: {'Content-Type': 'application/json'}
		    //params: {user_id: $scope.username}
		}).success(function(response){
			//console.log(response.data)
			$scope.spotorders = response.data;
		});
	}

	function mmorders(){
		$http({
		    url: '/get_all_mm_orders/'+$scope.username, 
		    method: "GET",
		    headers: {'Content-Type': 'application/json'}
		}).success(function(response){
			$scope.custorders_mm = response.data;
		});
	}

	function forwardorders(){
		$http({
		    url: '/get_all_forward_orders/' + $scope.username, 
		    method: "GET",
		    headers: {'Content-Type': 'application/json'}
		}).success(function(response){
			$scope.custorders_forward = response.data;
		});
	}
	
	$scope.viewoffers = function(orderid){
		ordersService.offer(orderid).then(function(d) {
		    $scope.orderdetails = d.data.data;
		    $scope.offertitle = 'for Deal Number: '+d.data.data[0].orderidfk;
		});
	};

	$scope.viewforwardoffers = function(orderid){
		var x = orderid;
		$scope.orderdetails = [];
		$scope.offertitle = '';
		ordersService.forwardoffer(x).then(function(d) {
		    $scope.orderdetails = d.data.data;
		    $scope.offertitle = 'for Deal Number: '+d.data.data[0].orderidfk;
		});
	};

	$scope.viewswapoffers = function(orderid){
		var x = orderid;
		ordersService.swapoffer(x).then(function(d) {
		  	//console.log(d.data);
		    $scope.orderdetails = d.data.data;
		    $scope.offertitle = 'for Deal Number: '+d.data.data[0].orderidfk;
		});
	};

	$scope.viewmmoffers = function(orderid){
		console.log('Details of mm offer loading ... ',orderid);
		$scope.loading = true;
		var x = orderid;
		ordersService.offer_s_mm(x).then(function(d) {
			console.log(d);
		    $scope.orderdetails = d.data;
		    $scope.offertitle = 'for Deal Number: ' + d.data[0].orderidfk;
		});
	};
	
})

app.controller('custCtrlswap', function($scope,$http,ordersService,socketio){
	$scope.username = window.sessionStorage.getItem("username")
	

	$scope.custorders_swap = [];
	
	spoto()
	
	socketio.on('new swap offer', function(msg){
		spoto()
	});
	
	function spoto(){
		$http({
		    url: '/get_all_swap_orders/'+$scope.username, 
		    method: "GET",
		    headers: {'Content-Type': 'application/json'}
		    //params: {user_id: $scope.username}
		}).success(function(response){
			//console.log(response.data)
			$scope.custorders_swap = response.data;
		});
	}
	
	$scope.viewoffers = function(orderid){
		ordersService.offer(orderid).then(function(d) {
		  	console.log(d.data.data[0]);
		    $scope.orderdetails = d.data.data;
		    $scope.offertitle = 'for Deal Number: '+d.data.data[0].orderidfk;
		});
	};
	
})

app.controller('offeracceptCtrl', function($scope,$stateParams,$state,$http,ordersService){
	var orderid = $stateParams.orderidfk;
	var offerid = $stateParams.offerid;
	
	$scope.acceptofferswap = [];
	$scope.acceptoffer = [];
	$scope.acceptoffer.limit_num = 0;
	
	ordersService.offerdetails(offerid).then(function(d) {
	    $scope.acceptoffer = d.data.data[0];
	    if($scope.acceptoffer.buysell == "BUY" && $scope.acceptoffer.buyorderamount>0){
	    	$scope.acceptoffer.limit_num = 3;
	    	$scope.acceptoffer._buysell ="Buy";
	    	$scope.acceptoffer._buysell2 ="Sell";
	    }else if($scope.acceptoffer.buysell == "BUY" && $scope.acceptoffer.sellorderamount>0){
	    	$scope.acceptoffer.limit_num = -3;
	    	$scope.acceptoffer._buysell ="Sell";
	    	$scope.acceptoffer._buysell2 ="Buy";
	    }else if($scope.acceptoffer.buysell == "SELL" && $scope.acceptoffer.buyorderamount>0){
	    	$scope.acceptoffer.limit_num = -3;
	    	$scope.acceptoffer._buysell ="Buy"
	    	$scope.acceptoffer._buysell2 ="Sell";
	    }else if($scope.acceptoffer.buysell == "SELL" && $scope.acceptoffer.sellorderamount>0){
	    	$scope.acceptoffer.limit_num = 3;
	    	$scope.acceptoffer._buysell ="Sell"
	    	$scope.acceptoffer._buysell2 ="Buy";
	    }
	});
	
	$scope.accept = function(){
					
		ordersService.updateOffersQuery(offerid).then(function(response){
		});
		
		ordersService.updateOrdersQuery($scope.acceptoffer.orderidfk).then(function(response){
			alert('offer accepted');
			$state.go('home');
		});
	};
	
})

app.controller('forwardofferacceptCtrl', function($scope,$stateParams,$state,$http,ordersService){
	var orderid = $stateParams.orderidfk;
	var offerid = $stateParams.offerid;
	
	$scope.acceptofferswap = [];
	$scope.acceptoffer = [];
	
	ordersService.forwardofferdetails(offerid).then(function(d) {
		//console.log(d.data.data[0]);
	    $scope.acceptoffer = d.data.data[0];
	});
	
	$scope.accept = function(){
					
		ordersService.updateForwardQuery(offerid).then(function(response){
		});
		
		ordersService.updateOrdersQueryforward($scope.acceptoffer.orderidfk).then(function(response){
			alert('offer accepted');
			$state.go('homeforward');
		});
	};
	
})

app.controller('neworderCtrl', function($scope,$http, $filter, $state){
	var username = window.sessionStorage.getItem('username');
	var domain = window.sessionStorage.getItem('custdomain');

	$scope.neworder = {};
	$scope.ccytitle = '';
	$scope.banks = [];

	$scope.num = 3;
	$scope.s_buy = false;
	$scope.s_sell = false;

	$http({
	    url: '/banks', 
	    method: "GET"
	}).success(function(data){
		$scope.banks = data.data;
	});

	$scope.newspotOrder = function(){
		$scope.dataLoading = true;
		var i = $scope.neworder.bank.length;
		var d = new Date();
		var n = d.getTime();

		for(x=0; x<=i-1;x++){
			var rescp = $scope.neworder.bank[x];
			var inbuysell = $scope.neworder.buysell;
					
			$scope.neworder.orderid = n;
			$scope.neworder.usernamefk = username;
			$scope.neworder.recipient = rescp;
			$scope.neworder.ordertypefk = 'FXSPOT';
			$scope.neworder.buysellbank = '';
					
			if(inbuysell=='SELL'){
				$scope.neworder.buysellbank = "BUY";
			}else{
				$scope.neworder.buysellbank = "SELL";
			}
			
			$http({
				method : 'POST',
				url:'/spotorders',
				headers: {'Content-Type': 'application/json'},
				data : {orderid:$scope.neworder.orderid,usernamefk:$scope.neworder.usernamefk,ccypair:$scope.neworder.ccypair,buyorderamount:$scope.neworder.buyorderamount,
              		sellorderamount:$scope.neworder.sellorderamount,buysell:$scope.neworder.buysell,buysellbank:$scope.neworder.buysellbank,recipient:rescp,settlementdate:$scope.neworder.settlementdate,
              		custcomment:$scope.neworder.custcomment,ordertypefk:$scope.neworder.ordertypefk,ccysellorderamount:$scope.neworder.ccysellorderamount,
              		ccybuyorderamount:$scope.neworder.ccybuyorderamount}
			}).success(function(response){
				$scope.dataLoading = false;
				alert('New FXSPOT order successfully submitted');
				$state.go('home');
			}).error(function(error){
				$scope.dataLoading = false;
				console.log('Error on adding new Spot order', error.err);
			});
			
		}
	}
				
	$scope.$watch("neworder.buysell", function (newval) {
	    if(newval == 'BUY'){
	        $scope.num = 3;	
	        $scope.neworder.ccybuyorderamount = $filter('limitTo')($scope.neworder.ccypair,3);	
	        $scope.neworder.ccysellorderamount = $filter('limitTo')($scope.neworder.ccypair,-3);
	        //console.log($scope.neworder.ccybuyorderamount+$scope.neworder.ccysellorderamount);			
	    }else{
	        $scope.num = -3;
	        $scope.neworder.ccybuyorderamount = $filter('limitTo')($scope.neworder.ccypair,3);
	        $scope.neworder.ccysellorderamount = $filter('limitTo')($scope.neworder.ccypair,-3);	
	        //console.log($scope.neworder.ccysellorderamount+$scope.neworder.ccybuyorderamount);					
	    };
	}, true);
	            
	$scope.$watch("neworder.ccypair", function (newval) {
	    $scope.ccytitle = newval;
	    //ccytitle insert into currencies values ('limitTo:num
	    $scope.neworder.ccybuyorderamount = $filter('limitTo')(newval,$scope.num);
	    $scope.neworder.ccysellorderamount = $filter('limitTo')(newval,-$scope.num)
	}, true);

	$scope.$watch("neworder.mybanks", function(newval) {
				    if(newval){
				    	$scope.neworder.bank={};
				    	
				    }else{
				    	$scope.neworder.bank={};				    	
				    };
	});
	            
	            $scope.setfunct = function(){
	            	if($scope.neworder.buyorderamount !== ""){
	            		$scope.neworder.sellorderamount = '';
	            	}
	            }
	            
	            $scope.setfunct2 = function(){
	            	if($scope.neworder.sellorderamount !== ""){
	            		$scope.neworder.buyorderamount = '';
	            	}
	            }
})

app.controller('custconfirmationsCtrl', function($scope,ordersService){
	$scope.toconfirmoffers = [];
	//$scope.Data.pagetitle = 'FxSpot Confirmations';
	ordersService.to_confirm_offers(1).then(function(d){
		$scope.toconfirmoffers = d.data.data;
	});
})

app.controller('confirmofferCtrl', function($scope, $stateParams,$http,$state, ordersService) {
    var offerid = $stateParams.offerid;
    $scope.reject = {};
    $scope.showAccept = false;
    $scope.showReject = false;
    
    ordersService.offerdetails(offerid).then(function(d){
    	//console.log(d.data[0]);
		$scope.booking = d.data.data[0];
		if($scope.booking.buysellbank == 'SELL' && $scope.booking.buyorderamount>0){
			$scope.lim = 3;
			$scope.booking.rec = "PAY";
			$scope.booking.pay = "REC";
			$scope.booking.recamount = $scope.booking.orderamount;
			$scope.booking.payamount = $scope.booking.settleamount;
		}
		else if($scope.booking.buysellbank == 'SELL' && $scope.booking.sellorderamount>0){
			$scope.lim = 3;
			$scope.booking.rec = "PAY";
			$scope.booking.pay = "REC";
			$scope.booking.recamount = $scope.booking.settleamount;
			$scope.booking.payamount = $scope.booking.orderamount;
		}
		else if($scope.booking.buysellbank == 'BUY' && $scope.booking.sellorderamount>0){
			//$scope.booking.rec = "REC";
			//$scope.booking.pay = "PAY";
			$scope.lim = -3;
			$scope.booking.recamount = $scope.booking.settleamount;
			$scope.booking.payamount = $scope.booking.orderamount;
		}
		else if($scope.booking.buysellbank == 'BUY' && $scope.booking.buyorderamount>0){
			//$scope.booking.rec = "REC";
			$scope.lim = -3;
			$scope.booking.recamount = $scope.booking.orderamount;
			$scope.booking.payamount = $scope.booking.settleamount;
		}
	})
	
	$scope.accept = function(){
		//accept booked deal
		$http({
		   method: 'POST',
		   url: '/accept_deal',
		   headers: {'Content-Type': 'application/json'},
		   data : {offerid:offerid}
		}).success(function (data) {
		    alert("Deal Accepted");
			$state.go('custconfirmations');
		}).error(function (err) {
		    alert("Error accepting deal ", err);
		});	
		
	}
	
	$scope.reject = function(){
		//reject booked deal
		$http({
		    method: 'POST',
		    url: '/reject_deal',
		    headers: {'Content-Type': 'application/json'},
		    data : {id:offerid,reason:$scope.reject.rejectreason}
		 }).success(function (data) {
		    alert("Deal Rejected Submitted");
			$state.go('custconfirmations');
		 }).error(function (error) {
		    alert("Error rejecting deal ",err);
		});	
		
	}
	
				$scope.$watch("booking.confirm", function (newval) {
	               if(newval=="Reject"){
	                    $scope.showAccept = false;
    					$scope.showReject = true;
	                 }else{
	              	 	$scope.showAccept = true;
    					$scope.showReject = false;
	                 }
	               }, true);
})

app.controller('confirmofferforwardCtrl', function($scope, $stateParams,$http,$state, ordersService) {
    var offerid = $stateParams.offerid;
    $scope.reject = {};
    $scope.showAccept = false;
    $scope.showReject = false;
    $scope.schedules = [];
    
    ordersService.forwardofferdetails(offerid).then(function(d){
    	//console.log(d.data.data[0]);
		$scope.booking = d.data.data[0];

		var freqnum = d.data.data[0].freqnum;
    	var freq = d.data.data[0].freq;

    	for(i=1;i<=freqnum;i++){
    		if(freq == "Monthly"){
    			$scope.schedules.push({
    				settlementdate : $scope.booking.startdate+' month '+i
    			});
    		}else if(freq == "Weekly"){
    			$scope.schedules.push({
	    			settlementdate : $scope.booking.startdate+' week '+i
	    		});
    		}else{
    			$scope.schedules.push({
	    			settlementdate : $scope.booking.startdate
	    		});
    		}
    		
    	}

		if($scope.booking.buysellbank == 'SELL' && $scope.booking.buyorderamount>0){
			$scope.lim = 3;
			$scope.booking.rec = "PAY";
			$scope.booking.pay = "REC";
			$scope.booking.recamount = $scope.booking.orderamount;
			$scope.booking.payamount = $scope.booking.settlementamount;
		}
		else if($scope.booking.buysellbank == 'SELL' && $scope.booking.sellorderamount>0){
			$scope.lim = 3;
			$scope.booking.rec = "PAY";
			$scope.booking.pay = "REC";
			$scope.booking.recamount = $scope.booking.settlementamount;
			$scope.booking.payamount = $scope.booking.orderamount;
		}
		else if($scope.booking.buysellbank == 'BUY' && $scope.booking.sellorderamount>0){
			$scope.booking.rec = "PAY";
			$scope.booking.pay = "REC";
			$scope.lim = -3;
			$scope.booking.recamount = $scope.booking.settlementamount;
			$scope.booking.payamount = $scope.booking.orderamount;
		}
		else if($scope.booking.buysellbank == 'BUY' && $scope.booking.buyorderamount>0){
			$scope.booking.rec = "PAY";
			$scope.booking.pay = "REC";
			$scope.lim = -3;
			$scope.booking.recamount = $scope.booking.orderamount;
			$scope.booking.payamount = $scope.booking.settlementamount;
		}
	})
	
	$scope.accept = function(){
		//accept booked deal
		$http({
		   method: 'POST',
		   url: '/accept_forward_deal',
		   headers: {'Content-Type': 'application/json'},
		   data : {offerid:offerid}
		}).success(function (data) {
		    alert("Deal Accepted");
			$state.go('custconfirmations_forward');
		}).error(function (err) {
		    alert("Error accepting deal ", err);
		    $state.go('custconfirmations_forward');
		});	
		
	}
	
	$scope.reject = function(){
		//reject booked deal
		$http({
		    method: 'POST',
		    url: '/reject_forward_deal',
		    headers: {'Content-Type': 'application/json'},
		    data : {id:offerid,reason:$scope.reject.rejectreason}
		 }).success(function (data) {
		    alert("Deal Rejected Submitted");
			$state.go('custconfirmations_forward');
		 }).error(function (error) {
		    alert("Error rejecting deal ",err);
		    $state.go('custconfirmations_forward');
		});	
		
	}
	
				$scope.$watch("booking.confirm", function (newval) {
	               if(newval=="Reject"){
	                    $scope.showAccept = false;
    					$scope.showReject = true;
	                 }else{
	              	 	$scope.showAccept = true;
    					$scope.showReject = false;
	                 }
	               }, true);
})

app.controller('newswaporderCtrl', function($state,$scope,$http,$filter,ordersService){
	var username = window.sessionStorage.getItem('username');
	console.log('newswaporderCtrl '+username);
	$scope.newswaporder = {};
	$scope.ccytitle = {};
	$scope.banks = [];
	
	//$scope.Data = Data;
	//$scope.Data.pagetitle = 'New SWAP Order';
	
	ordersService.getbanks().then(function(d){
		$scope.banks = d.data.data;
	})
	
				$scope.setfunct = function(){
	            	if($scope.newswaporder.nearbuyorderamount !== ""){
	            		$scope.newswaporder.nearsellorderamount = '';
	            		$scope.newswaporder.farbuyorderamount = '';
	            		$scope.newswaporder.farsellorderamount = $scope.newswaporder.nearbuyorderamount;
	            	}
	            }
	            
	            $scope.setfunct2 = function(){
	            	if($scope.newswaporder.nearsellorderamount !== ""){
	            		$scope.newswaporder.nearbuyorderamount = '';
	            		$scope.newswaporder.farsellorderamount = '';
	            		$scope.newswaporder.farbuyorderamount = $scope.newswaporder.nearsellorderamount;
	            	}
					
	            }
	
			$scope.save_swapOrder = function(){
				$scope.dataLoading = true;
				$scope.loading = true;
				var i = $scope.newswaporder.bank.length;
				var d = new Date();
				var n = d.getTime();
				
				for(x=0; x<=i-1;x++){
							var rescp = $scope.newswaporder.bank[x];
							var inbuysell = $scope.newswaporder.buysell;
							
							$scope.newswaporder.orderid = n;
							$scope.newswaporder.usernamefk = username;
							$scope.newswaporder.recipient = rescp;
							$scope.newswaporder.ordertypefk = 'FXSWAP';
							$scope.newswaporder.buysellbank = '';
							
							if(inbuysell=='SELL'){
								$scope.newswaporder.buysellbank = "BUY";
							}else{
								$scope.newswaporder.buysellbank = "SELL";
							}
							
							$http({
				              method: 'POST',
				              url: '/add_swap_order',
				              headers: {'Content-Type': 'application/json'},
				              data:{orderid:$scope.newswaporder.orderid,usernamefk:$scope.newswaporder.usernamefk,ccypair:$scope.newswaporder.ccypair,neardate:$scope.newswaporder.neardate,
				              		nearbuyorderamountccy:$scope.newswaporder.nearbuyorderamountccy,nearbuyorderamount:$scope.newswaporder.nearbuyorderamount,nearsellorderamountccy:$scope.newswaporder.nearsellorderamountccy,
				              		nearsellorderamount:$scope.newswaporder.nearsellorderamount,buysell:$scope.newswaporder.buysell,buysellbank:$scope.newswaporder.buysellbank,recipient:rescp,fardate:$scope.newswaporder.fardate,farbuyorderamountccy:$scope.newswaporder.farbuyorderamountccy,
				              		farbuyorderamount:$scope.newswaporder.farbuyorderamount,farsellorderamountccy:$scope.newswaporder.farsellorderamountccy,farsellorderamount:$scope.newswaporder.farsellorderamount,
				              		custcomment:$scope.newswaporder.custcomment,ordertypefk:$scope.newswaporder.ordertypefk}
		      				}).success(function (data) {
		      				  $scope.dataLoading = false;
				              alert("New FxSwap Order Submitted ");
				              $scope.newswaporder = {};
				              $state.go('homeswap');
				            }).error(function () {
				            	$scope.dataLoading = false;
				                alert("Error making FxSwap order");
				            });	
						}
			}
	
				$scope.$watch("newswaporder.buysell", function (newval) {
	               if(newval == 'BUY'){
	               		$scope.newswaporder.nearbuyorderamountccy = $filter('limitTo')($scope.newswaporder.ccypair,3);
	               		$scope.newswaporder.nearsellorderamountccy = $filter('limitTo')($scope.newswaporder.ccypair,-3);
	               		$scope.newswaporder.farsellorderamountccy = $filter('limitTo')($scope.newswaporder.ccypair,3);
	               		$scope.newswaporder.farbuyorderamountccy = $filter('limitTo')($scope.newswaporder.ccypair,-3);
	               }else{
	               		$scope.newswaporder.nearbuyorderamountccy = $filter('limitTo')($scope.newswaporder.ccypair,-3);
	               		$scope.newswaporder.nearsellorderamountccy = $filter('limitTo')($scope.newswaporder.ccypair,3);
	               		$scope.newswaporder.farsellorderamountccy = $filter('limitTo')($scope.newswaporder.ccypair,-3);
	               		$scope.newswaporder.farbuyorderamountccy = $filter('limitTo')($scope.newswaporder.ccypair,3);
	               };
	            }, true);
	
})

app.controller('newmmorderCtrl', function($scope, $stateParams,$state,$http,$interval,$timeout, ordersService) {
    var username = window.sessionStorage.getItem('username');
    var domain = window.sessionStorage.getItem('custdomain');
    //var custname = window.sessionStorage.getItem('custname');
   
    
    $scope.newmmorder = {};
	$scope.ccytitle = 'CCY';
	$scope.banks = [];
	$scope.currency = [];
	//$scope.newmmorder.mybanks = 'yes';
	
	//$scope.Data = Data;
	//$scope.Data.pagetitle = 'New Money Market Order';
	
	ordersService.getcurrency().then(function(d){
		//console.log(d.data.data);
		$scope.currency = d.data.data;
	})
	
	ordersService.getbanks().then(function(d){
		$scope.banks = d.data.data;
	})
	
	$scope.$watch("newmmorder.ccy", function (newval) {
		//console.log('New Value received ....'+newval);
	    $scope.ccytitle = newval;
	}, true);
	
	
	$scope.$watch("newmmorder.mybanks", function(newval) {
		console.log(newval);
	    if(newval){
	    	ordersService.getbanks().then(function(d){
				$scope.banks = d.data.data;
			})   	
	    }else{
	    	$scope.newmmorder.bank={};
	    	ordersService.getbanks().then(function(d){
				$scope.banks = d.data.data;
			})
	    };
	})
	
	//to hold at start
	var x = '01-02-2016';
	
	$scope.$watch("newmmorder.mmto", function(newval) {
		$scope.formatString = function(x) {
		    var day   = parseInt(x.substring(0,2));
		    var month  = parseInt(x.substring(3,5));
		    var year   = parseInt(x.substring(6,10));
		    var date = new Date(year, month-1, day);
		    return date;
		}
		var date2 = new Date($scope.formatString($scope.newmmorder.mmto));
	    var date1 = new Date($scope.formatString($scope.newmmorder.mmfrom));
	    var timeDiff = Math.abs(date2.getTime() - date1.getTime());
		
		console.log('Date 2 ..'+ date2 + $scope.newmmorder.mmto);
		console.log('Date 1 ..'+ date1);
		
	    $scope.dayDifference = Math.ceil(timeDiff / (1000 * 3600 * 24));
	    //console.log('Diffrence ..'+ $scope.dayDifference);
	    $scope.newmmorder.tenure = $scope.dayDifference;
	    $scope.newmmorder.tenuredisp = $scope.dayDifference + "D";
	}, true)
	
	$scope.save_mm_Order = function(){
		$scope.loading = true;
		
		var i = $scope.newmmorder.bank.length;
		//console.log(i);
		var d = new Date();
		var n = d.getTime();

				for(x=0; x<=i-1;x++){
					var rescp = $scope.newmmorder.bank[x];
					var inmmtype = $scope.newmmorder.mmtype;
										
					$scope.newmmorder.orderid = n;
					$scope.newmmorder.usernamefk = username;
					$scope.newmmorder.recipient = rescp;
					$scope.newmmorder.ordertypefk = 'MM';
					
					if(inmmtype=='Placement'){
						$scope.newmmorder.mmtypebank = "Deposit";
					}else{
						$scope.newmmorder.mmtypebank = "Placement";
					}
					
					$http({
		              method: 'POST',
		              url: '/add_mm',
		              headers: {'Content-Type': 'application/json'},
		              data:{orderid:$scope.newmmorder.orderid,usernamefk:$scope.newmmorder.usernamefk,ccy:$scope.newmmorder.ccy,orderamount:$scope.newmmorder.orderamount,
		              		mmfrom:$scope.newmmorder.mmfrom,mmto:$scope.newmmorder.mmto,tenure:$scope.newmmorder.tenure,recipient:rescp,custcomment:$scope.newmmorder.custcomment,
		              		ordertypefk:$scope.newmmorder.ordertypefk,mmtype:$scope.newmmorder.mmtype,mmtypebank:$scope.newmmorder.mmtypebank,custname:domain}
      				}).success(function (data) {
		              //console.log(data);
					  $timeout(function(){
					  	$scope.loading = false;
					  	alert("New Money Market Order Submitted ");
					  	$scope.newmmorder = {};
					  	$state.go('homemoneymarket');
					  },3000)
		            }).error(function () {
		                alert("Error making new order");
		                $scope.newmmorder = {};
						$state.go('homemoneymarket');
		            });
		            
				}
	}
	
});

app.controller('custpaymentsCtrl', function($scope,ordersService,socketio){
	$scope.payments_spot = [];
	$scope.payments_swap = [];
	$scope.payments_forward = [];
	$scope.payments_mm = [];

    $scope.payments_forward_notification = 0;

    payments_forward();

    socketio.on('payments_forward', function(msg){
        payments_forward();
       // Notification.success({message: msg.buysell+' '+msg.ccypair+'<br><b>'+ msg.usernamefk+'</b><br><a href="#/homemm">Make an Offer</a>', title: 'MarginIQ',positionY: 'bottom', positionX: 'right', delay: null});
    });


	function payments_forward(){
	    ordersService.payments_forward().then(function(d){
	        $scope.confirmedforwardoffers = d.data.data
	        $scope.payments_forward_notification = d.data.data.length;
	    }) 
	}
});

app.controller('sheduleCtrl', function($scope, $stateParams){
	var freq = $stateParams.freq;
	var nofreq = $stateParams.nofreq;
	var startdate = $stateParams.startdate;
	var buyorderamount = $stateParams.buyorderamount;

	$scope.schedules = [];

	if(freq == 'Weekly'){
		addx = 7;
	}else{
		addx = 30;
	}

		$scope.formatString = function(startdate) {
		    var day   = parseInt(startdate.substring(0,2));
		    var month  = parseInt(startdate.substring(3,5));
		    var year   = parseInt(startdate.substring(6,10));
		    var date = new Date(year, month-1, day);
		    return date;
		}
		var date1 = new Date($scope.formatString(startdate));
		console.log(date1);
		console.log(date1.setMonth(12));
		var d = new Date();
		console.log(d.setMonth(d.getMonth(), 0));

	for(i=1; i<=nofreq;i++){
		$scope.schedules.push(
			{'frequency':freq +' '+i,
			'buyamount':buyorderamount,
			'startdate':startdate}
			);
	}

	//console.log($scope.schedules);
})

app.controller('newforwardorderCtrl', function($state,$scope,$http,$filter,$timeout,ordersService){
	var username = window.sessionStorage.getItem('username');
	console.log('username ::: ',username);
	$scope.newforwardorder = [];
	$scope.ccytitle = {};
	$scope.banks = [];
	
	//$scope.Data = Data;
	//$scope.Data.pagetitle = 'New FxForward Order';
	
	ordersService.getbanks().then(function(d){
		$scope.banks = d.data.data;
	})
	
	
	$scope.saveforwardorder = function(){
		$scope.dataLoading = true;
		
		var i = $scope.newforwardorder.bank.length;
		var freq = $scope.newforwardorder.frequency;
		var nofreq = $scope.newforwardorder.nofrequency;
		
		var d = new Date();
		var n = d.getTime();
	
				for(x=0; x<=i-1;x++){
					var rescp = $scope.newforwardorder.bank[x];
					var inbuysell = $scope.newforwardorder.buysell;
					
					$scope.newforwardorder.orderid = n;
					$scope.newforwardorder.forwardid = n;
					$scope.newforwardorder.usernamefk = username;
					$scope.newforwardorder.recipient = rescp;
					$scope.newforwardorder.ordertypefk = 'FXFORWARD';
					$scope.newforwardorder.buysellbank = '';
					$scope.newforwardorder.settlementdate = $scope.newforwardorder.startdate;
					
					if(inbuysell=='SELL'){
						$scope.newforwardorder.buysellbank = "BUY";
					}else{
						$scope.newforwardorder.buysellbank = "SELL";
					}
					
					$http({
		              method: 'POST',
		              url: './add_forward_order',
		              headers: {'Content-Type': 'application/json'},
		              data:{orderid:$scope.newforwardorder.orderid,forwardid:$scope.newforwardorder.forwardid,usernamefk:username,ccypair:$scope.newforwardorder.ccypair,buyorderamountccy:$scope.newforwardorder.buyorderamountccy,buyorderamount:$scope.newforwardorder.buyorderamount,
		              		sellorderamountccy:$scope.newforwardorder.sellorderamountccy,sellorderamount:$scope.newforwardorder.sellorderamount,buysell:$scope.newforwardorder.buysell,buysellbank:$scope.newforwardorder.buysellbank,recipient:rescp,settlementdate:$scope.newforwardorder.settlementdate,
		              		custcomment:$scope.newforwardorder.custcomment,ordertypefk:$scope.newforwardorder.ordertypefk,freq:$scope.newforwardorder.frequency,freqnum:$scope.newforwardorder.nofrequency,startdate:$scope.newforwardorder.startdate}
      				}).success(function (data) {
		              	//console.log(data);
		              	$timeout(function() {
		              		alert("New FxForward Order Submitted ");
					        $scope.newforwardorder = {};
		              		$state.go('homeforward');
					        $scope.dataLoading = false;
					   	}, 3000);
		            }).error(function () {
		            	 $scope.dataLoading = false;
		                alert("Error making new FxForward order");
		                $scope.newforwardorder = {};
						$state.go('homeforward');
		            });	
				}
	
	}
	
				$scope.$watch("newforwardorder.buysell", function (newval) {
	               if(newval == 'BUY'){
	               		$scope.newforwardorder.buyorderamountccy = $filter('limitTo')($scope.newforwardorder.ccypair,3);
	               		$scope.newforwardorder.sellorderamountccy = $filter('limitTo')($scope.newforwardorder.ccypair,-3);
	               }else{
	               		$scope.newforwardorder.buyorderamountccy = $filter('limitTo')($scope.newforwardorder.ccypair,-3);
	               		$scope.newforwardorder.sellorderamountccy = $filter('limitTo')($scope.newforwardorder.ccypair,3);
	               };
	            }, true);
	            
	            $scope.$watch("newforwardorder.frequency", function (newval) {
	               if(newval == 'Single'){
	               		$scope.newforwardorder.nofrequency = 1;
	               }else{
	               		$scope.newforwardorder.nofrequency = '';
	               };
	            }, true);
	            
	            $scope.setfunct = function(){
	            	if($scope.newforwardorder.buyorderamount !== ""){
	            		$scope.newforwardorder.sellorderamount = '';
	            	}
	            }
	            
	            $scope.setfunct2 = function(){
	            	if($scope.newforwardorder.sellorderamount !== ""){
	            		$scope.newforwardorder.buyorderamount = '';
	            	}
					
	            }
	            
	            $scope.$watch("newforwardorder.mybanks", function(newval) {
				    if(newval){
				    	$scope.newforwardorder.bank={};
				    	ordersService.getmybanks().then(function(d){
							$scope.banks = d.data.data;
						})
				    }else{
				    	$scope.newforwardorder.bank={};
				    	ordersService.getbanks().then(function(d){
							$scope.banks = d.data.data;
						})
				    };
				})
	
});

app.controller('custconfirmations_forwardCtrl', function($scope,ordersService){
	$scope.toconfirmoffers = [];
	//$scope.Data.pagetitle = 'FxSpot Confirmations';
	ordersService.to_confirm_forward(1).then(function(d){
		//console.log(d.data.data);
		$scope.toconfirmoffers = d.data.data;
	})	
});

