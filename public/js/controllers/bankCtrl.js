var app = angular.module('bankCtrl', ['marginService','ui-notification']);

app.controller('indexCtrl', function($scope,$window,AuthService,socketio){
	$scope.msgNotification = [{title:"sample Msg"}]
	socketio.on('ticket', function(msg){
		$scope.msgNotification.push({title:msg});
		//console.log(msg);
	});
	
	$scope.logout = function() {
	    AuthService.logout();
	    $window.open('login.html','_self');
	    window.sessionStorage.clear();
	 };
});

app.controller('bankCtrl', function($scope,$http,socketio,Notification){
	var username = sessionStorage.getItem('username');
	var domain = sessionStorage.getItem('bankdomain');
	
	console.log('--> logged in as '+ username + '::'+ domain);
	
	socketio.on('ticket', function(msg){
		openSpotorders();
		Notification.success({message: msg.buysell+' '+msg.ccypair+'<br><b>'+ msg.usernamefk+'</b><br><a href="#/home">Make an Offer</a>', title: 'MarginIQ',positionY: 'bottom', positionX: 'right', delay: null});
	});

	socketio.on('new mm order', function(msg){
		openMMorders();
		Notification.success({message: msg.buysell+' '+msg.ccypair+'<br><b>'+ msg.usernamefk+'</b><br><a href="#/homemm">Make an Offer</a>', title: 'MarginIQ',positionY: 'bottom', positionX: 'right', delay: null});
	});

	socketio.on('new forward order', function(msg){
		openForwardorders();
		Notification.success({message: msg.buysell+' '+msg.ccypair+'<br><b>'+ msg.usernamefk+'</b><br><a href="#/homeforward">Make an Offer</a>', title: 'MarginIQ',positionY: 'bottom', positionX: 'right', delay: null});
	});
	
	$scope.orders = [];
	$scope.orders_swap = [];
	$scope.orders_mm = [];
	$scope.orders_forward = [];
	$scope.swapnotification = 0;
	$scope.spotnotification = 0;
	$scope.forwardnotification = 0;
	$scope.mmnotification = 0;
	
	openSpotorders();
	openMMorders();
	openForwardorders();

	function openSpotorders(){
		$http({
		    url: '/getbankorders/'+ username, 
		    method: "GET",
		    headers: {'Content-Type': 'application/json'}
		}).success(function(response){
			$scope.orders = response.data;
			$scope.spotnotification = response.data.length;
		});
	};

	function openMMorders(){
		$http({
		    url: '/get_bank_orders_mm/'+ username, 
		    method: "GET",
		    headers: {'Content-Type': 'application/json'}
		}).success(function(response){
			//console.log(response.data);
			$scope.orders_mm = response.data;
			$scope.mmnotification = response.data.length;
		});
	};

	function openForwardorders(){
		$http({
		    url: '/get_bank_orders_forward/'+ domain, 
		    method: "GET",
		    headers: {'Content-Type': 'application/json'}
		}).success(function(response){
			//console.log(response.data);
			$scope.orders_forward = response.data;
			$scope.forwardnotification = response.data.length;
		});
	};

});

app.controller('bankCtrlswap', function($scope,$http,socketio,Notification){

	var username = sessionStorage.getItem('username');
	var domain = sessionStorage.getItem('bankdomain');
	
	socketio.on('new swap order', function(msg){
		openSwaporders();
		Notification.success({message: msg.buysell+' '+msg.ccypair+'<br><b>'+ msg.usernamefk+'</b><br><a href="#/home">Make an Offer</a>', title: 'MarginIQ',positionY: 'bottom', positionX: 'right', delay: null});
	});
	
	$scope.orders_swap = [];
	$scope.swapnotification = 0;
	
	openSwaporders();
	
	function openSwaporders(){
		$http({
		    url: '/get_bank_orders_swap/'+ domain, 
		    method: "GET",
		    headers: {'Content-Type': 'application/json'}
		}).success(function(response){
			//console.log(response.data);
			$scope.orders_swap = response.data;
			$scope.swapnotification = response.data.length;
		});
	};
});

app.controller('newofferCtrl', function($scope,$stateParams,$http,$filter,$state, ordersService){
	var username = window.sessionStorage.getItem('username');
	var domain = window.sessionStorage.getItem('bankdomain');
	
	var orderid = $stateParams.indexid;
	var indexid = $stateParams.indexid;
	
	$http({
	    url: '/getanorder/'+ orderid, 
	    method: "GET",
	    headers: {'Content-Type': 'application/json'}
	}).success(function(response){
		//console.log(response.data);
		$scope.newoffer = response.data[0];
		$scope.newoffer.orderindex = response.data[0].orderindex;
	    $scope.newoffer.orderidfk = response.data[0].orderid;
	    $scope.newoffer.offeredby = username;
	    $scope.newoffer.reqamount = 0;
	    $scope.newoffer.buysell = response.data[0].buysell;
	    $scope.newoffer.buyorderamount = response.data[0].buyorderamount;
	    $scope.newoffer.sellorderamount = response.data[0].sellorderamount;
	    
	    if($scope.newoffer.buysell == 'BUY' && $scope.newoffer.buyorderamount > 0){
	    	$scope.holder = 3;
	    	$scope.newoffer.buy_sell1 = "Sell";
	    	$scope.newoffer.buy_sell = "Buy";
	    	$scope.newoffer.ccysettleamount = $filter('limitTo')($scope.newoffer.ccypair,-3);
	    }else if($scope.newoffer.buysell == 'BUY' && $scope.newoffer.sellorderamount > 0){
	    	$scope.holder = -3;
	    	$scope.newoffer.buy_sell1 = "Buy";
	    	$scope.newoffer.buy_sell = "Sell";
	    	$scope.newoffer.ccysettleamount = $filter('limitTo')($scope.newoffer.ccypair,-3);
	    }else if($scope.newoffer.buysell == 'SELL' && $scope.newoffer.sellorderamount > 0){
	    	$scope.holder = 3;
	    	$scope.newoffer.buy_sell1 = "Buy";
	    	$scope.newoffer.buy_sell = "Sell";
	    	$scope.newoffer.ccysettleamount = $filter('limitTo')($scope.newoffer.ccypair,-3);
	    }else if($scope.newoffer.buysell == 'SELL' && $scope.newoffer.buyorderamount > 0){
	    	$scope.holder = -3;
	    	$scope.newoffer.buy_sell1 = "Sell";
	    	$scope.newoffer.buy_sell = "Buy";
	    	$scope.newoffer.ccysettleamount = $filter('limitTo')($scope.newoffer.ccypair,-3);
	    }else{
	    	$scope.holder = -3;
	    	$scope.newoffer.buy_sell1 = "Buy";
	    	$scope.newoffer.buy_sell = "Sell";
	    	$scope.newoffer.ccysettleamount = $filter('limitTo')($scope.newoffer.ccypair,3);
	    }
	});
	
	$scope.fill = function(){
		if($scope.newoffer.buysellbank == 'BUY'){
			$scope.newoffer.offeredrate = $filter('number')(parseFloat($scope.newoffer.spotrate) - parseFloat($scope.newoffer.magin/100),2);
		}else{
			$scope.newoffer.offeredrate = parseFloat($scope.newoffer.spotrate) + parseFloat($scope.newoffer.magin/100);
		}
		
		if($scope.newoffer.buysell == 'BUY' && $scope.newoffer.buyorderamount > 0){
			$scope.newoffer.settleamount = ($scope.newoffer.orderamount*$scope.newoffer.offeredrate);
			//console.log($scope.newoffer.ccysettleamount);
		}else if($scope.newoffer.buysell == 'BUY' && $scope.newoffer.sellorderamount > 0){
			$scope.newoffer.settleamount = ($scope.newoffer.orderamount/$scope.newoffer.offeredrate);
			$scope.newoffer.ccysettleamount = $filter('limitTo')($scope.newoffer.ccypair,3);
		}else if($scope.newoffer.buysell == 'SELL' && $scope.newoffer.sellorderamount > 0){
			$scope.newoffer.settleamount = ($scope.newoffer.orderamount*$scope.newoffer.offeredrate);
			//console.log($scope.newoffer.ccysettleamount);
		}else if($scope.newoffer.buysell == 'SELL' && $scope.newoffer.buyorderamount > 0){
			$scope.newoffer.settleamount = $filter('number')(($scope.newoffer.orderamount/$scope.newoffer.offeredrate),2);
			$scope.newoffer.ccysettleamount = $filter('limitTo')($scope.newoffer.ccypair,3);
			//console.log('Testing settleamount ... with '+$scope.newoffer.offeredrate);
		}else{
			$scope.newoffer.settleamount = ($scope.newoffer.orderamount/$scope.newoffer.offeredrate);
		}
	};
	
	$scope.newOffer = function(){
		$scope.newoffer.offeredby = username;
				$http({
		           method: 'post',
		           url: '/new_offer',
		           headers: {'Content-Type': 'application/json'},
		           data:{orderindex:$scope.newoffer.orderindex,orderidfk:$scope.newoffer.orderid,spotrate:$scope.newoffer.spotrate,magin:$scope.newoffer.magin,offeredrate:$scope.newoffer.offeredrate,
		              		settlementdate:$scope.newoffer.settlementdate,offeredby:domain,bankuser:username,reqamount:$scope.newoffer.reqamount,settleamount:$scope.newoffer.settleamount,
		              		offercomment:$scope.newoffer.offercomment,ccysettleamount:$scope.newoffer.ccysettleamount}
		        }).success(function (data) {
		            alert("Offer Submitted");
					$state.go('home');
		        }).error(function (error) {
		            alert("Error when making an offer");
		            $state.go('home');
		        });	
		
		ordersService.updateorder(indexid).then(function(d){
			//console.log(d);
		});
	};
	
});

app.controller('offersCtrl', function($scope,ordersService){
	var username = window.sessionStorage.getItem('username');
	$scope.loading = true;
	$scope.offers=[];
	ordersService.all_offers(username).then(function(d) {
		console.log(d.data);
	    $scope.offers = d.data.data;
	    $scope.loading = false;
	});
	
});

app.controller('acceptedoffersCtrl', function($scope,ordersService){
	$scope.offers = [];
	$scope.buyoffers = [];
	$scope.swapoffers = [];
	$scope.forwardoffers = [];

	var username = window.sessionStorage.getItem('username');
	
	ordersService.accepted_offers(username).then(function(d){
		//console.log(d.data.data[0]);
		$scope.offers = d.data.data;
	})
	ordersService.accepted_buy_offers(username).then(function(d){
		//console.log(d.data);
		$scope.buyoffers = d.data.data;
	})

	ordersService.accepted_forward_offers(username).then(function(d){
		console.log(d.data.data);
		$scope.forwardoffers = d.data.data;
	})
	
	/*ordersService.accepted_swap_offers(username).then(function(d){
		console.log(d.data.data);
		$scope.swapoffers = d.data;
		$scope.swapnotification = d.data.length;
	})*/
})

app.controller('bookdealCtrl',function($scope,$http,$state,$stateParams,ordersService){
    	$scope.booking = {};
    	var offerid = $stateParams.offerid;
    	
    	ordersService.offerdetails(offerid).then(function(d){
    		$scope.booking = d.data.data[0];
    		if($scope.booking.buysellbank == 'SELL' && $scope.booking.buyorderamount>0){
    			$scope.lim = 3;
    			$scope.booking.rec = "PAY";
    			$scope.booking.pay = "REC";
    			$scope.recamount = $scope.booking.orderamount;
    			$scope.payamount = $scope.booking.settleamount;
    			$scope.booking.buysellrec = $scope.booking.buysell;
    			$scope.booking.buysellrec2 = $scope.booking.buysellbank;
    		}else if($scope.booking.buysellbank == 'SELL' && $scope.booking.sellorderamount>0){
    			$scope.lim = -3;
    			$scope.booking.rec = "REC";
    			$scope.booking.pay = "PAY";
    			$scope.recamount = $scope.booking.orderamount;
    			$scope.payamount = $scope.booking.settleamount;
    			$scope.booking.buysellrec = $scope.booking.buysellbank;
    			$scope.booking.buysellrec2 = $scope.booking.buysell;
    		}else if($scope.booking.buysellbank == 'BUY' && $scope.booking.sellorderamount>0){
    			$scope.lim = 3;
    			$scope.booking.rec = "REC";
    			$scope.booking.pay = "PAY";
    			$scope.recamount = $scope.booking.orderamount;
    			$scope.payamount = $scope.booking.settleamount;
    			$scope.booking.buysellrec = $scope.booking.buysell;
    			$scope.booking.buysellrec2 = $scope.booking.buysellbank;
    		}else if($scope.booking.buysellbank == 'BUY' && $scope.booking.buyorderamount>0){
    			$scope.lim = -3;
    			$scope.booking.rec = "PAY";
    			$scope.booking.pay = "REC";
    			$scope.recamount = $scope.booking.orderamount;
    			$scope.payamount = $scope.booking.settleamount;
    			$scope.booking.buysellrec = $scope.booking.buysellbank;
    			$scope.booking.buysellrec2 = $scope.booking.buysell;
    		}
    		
    	});
    	
    	$scope.custconfirm = function(){
    					$http({
    		              method: 'POST',
    		              url: '/confirm_offer',
    		              headers: {'Content-Type': 'application/json'},
    		              data : {offerid:offerid, sysdate:new Date()}
    		            }).success(function (data) {
    		              alert("Deal Successfully Booked ");
    					  $state.go('acceptedoffers');
    		            }).error(function (err) {
    		                alert("Error booking a deal",err);
    		            });
    		            
    	}
});

app.controller('bookdealforwardCtrl', function($scope,$stateParams,$http,ordersService){
	$scope.booking = {};
    var offerid = $stateParams.offerid;
    $scope.schedules = [];

    ordersService.forwardofferdetails(offerid).then(function(d){
    	console.log(d.data.data[0])
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
    	console.log($scope.schedules);

    	if($scope.booking.buysellbank == 'SELL' && $scope.booking.buyorderamount>0){
    			$scope.lim = 3;
    			$scope.booking.rec = "PAY";
    			$scope.booking.pay = "REC";
    			$scope.recamount = $scope.booking.orderamount;
    			$scope.booking.buysellrec = $scope.booking.buysell;
    			$scope.booking.buysellrec2 = $scope.booking.buysellbank;
    		}else if($scope.booking.buysellbank == 'SELL' && $scope.booking.sellorderamount>0){
    			$scope.lim = -3;
    			$scope.booking.rec = "REC";
    			$scope.booking.pay = "PAY";
    			$scope.recamount = $scope.booking.orderamount;
    			$scope.booking.buysellrec = $scope.booking.buysellbank;
    			$scope.booking.buysellrec2 = $scope.booking.buysell;
    		}else if($scope.booking.buysellbank == 'BUY' && $scope.booking.sellorderamount>0){
    			$scope.lim = 3;
    			$scope.booking.rec = "REC";
    			$scope.booking.pay = "PAY";
    			$scope.recamount = $scope.booking.orderamount;
    			$scope.booking.buysellrec = $scope.booking.buysell;
    			$scope.booking.buysellrec2 = $scope.booking.buysellbank;
    		}else if($scope.booking.buysellbank == 'BUY' && $scope.booking.buyorderamount>0){
    			$scope.lim = -3;
    			$scope.booking.rec = "PAY";
    			$scope.booking.pay = "REC";
    			$scope.recamount = $scope.booking.orderamount;
    			$scope.booking.buysellrec = $scope.booking.buysellbank;
    			$scope.booking.buysellrec2 = $scope.booking.buysell;
    		}
    })

    $scope.custconfirm = function(){
    	$http({
    		method : 'post',
    		url:'/confirm_offer_forward',
    		headers: {'Content-Type': 'application/json'},
    		data : {offerid:offerid, sysdate:new Date()}
    	}).success(function(data){
    		alert("Deal Successfully Booked ");
    		$state.go('acceptedofferforward');
    	}).error(function(err){
    		alert("Error booking a deal",err);
    	})
    }
})

app.controller('newswapofferCtrl', function($scope,$state,$stateParams,$http,ordersService,$filter){
	var username = window.sessionStorage.getItem('username');
	var domain = window.sessionStorage.getItem('bankdomain');
	
	var orderid = $stateParams.indexid;
	var indexid = $stateParams.indexid;
	//$scope.Data = Data;
	//$scope.Data.pagetitle = 'New Swap Offer';
	$scope.newswapoffer = {};
	$scope.holder = 0;
	
	ordersService.swaporder(indexid).then(function(d) {
		console.log(d.data.data[0]);
		$scope.newswapoffer = d.data.data[0];
		
		$scope.newswapoffer.orderindex = d.data.data[0].orderindex;
	    $scope.newswapoffer.orderidfk = d.data.data[0].orderid;
	    $scope.newswapoffer.offeredby = username;
	    $scope.newswapoffer.buysell = d.data.data[0].buysell;
	    $scope.newswapoffer.neardate = d.data.data[0].neardate;
	    $scope.newswapoffer.fardate = d.data.data[0].fardate;
	    $scope.newswapoffer.nearmagin = 0;
	    //
	    if($scope.newswapoffer.buysellbank == 'BUY'){
	    	$scope.holder = 3;
	    	$scope.newswapoffer.buysellbank_disp = 'BUY(leg 1) - SELL(leg 2)';
	    	$scope.newswapoffer.nearbuyorderamountccy_disp = $scope.newswapoffer.nearsellorderamountccy;
	    	$scope.newswapoffer.nearsellorderamountccy_disp = $scope.newswapoffer.nearbuyorderamountccy;
	    	$scope.newswapoffer.nearbuyorderamount_disp = $scope.newswapoffer.nearsellorderamount;
	    	$scope.newswapoffer.nearsellorderamount_disp = $scope.newswapoffer.nearbuyorderamount;
	    	//far leg
	    	$scope.newswapoffer.farbuyorderamountccy_disp = $scope.newswapoffer.farsellorderamountccy;
	    	$scope.newswapoffer.farsellorderamountccy_disp = $scope.newswapoffer.farbuyorderamountccy;
	    	$scope.newswapoffer.farbuyorderamount_disp = $scope.newswapoffer.farsellorderamount;
	    	$scope.newswapoffer.farsellorderamount_disp = $scope.newswapoffer.farbuyorderamount;
	    	
	    }else{
	    	$scope.holder = -3;
	    	$scope.newswapoffer.buysellbank_disp = 'SELL(leg 1) - BUY(leg 2)';
	    	$scope.newswapoffer.nearbuyorderamountccy_disp = $scope.newswapoffer.nearsellorderamountccy;
	    	$scope.newswapoffer.nearsellorderamountccy_disp = $scope.newswapoffer.nearbuyorderamountccy;
	    	$scope.newswapoffer.nearbuyorderamount_disp = $scope.newswapoffer.nearsellorderamount;
	    	$scope.newswapoffer.nearsellorderamount_disp = $scope.newswapoffer.nearbuyorderamount;
	    	//far leg
	    	$scope.newswapoffer.farbuyorderamountccy_disp = $scope.newswapoffer.farsellorderamountccy;
	    	$scope.newswapoffer.farsellorderamountccy_disp = $scope.newswapoffer.farbuyorderamountccy;
	    	$scope.newswapoffer.farbuyorderamount_disp = $scope.newswapoffer.farsellorderamount;
	    	$scope.newswapoffer.farsellorderamount_disp = $scope.newswapoffer.farbuyorderamount;
	    }
	    $scope.newswapoffer.nearlegamount1 = $filter('limitTo')(d.data.data[0].ccypair,$scope.holder)+d.data.data[0].orderamount;
	    $scope.newswapoffer.farlegamount1 = $filter('limitTo')(d.data.data[0].ccypair,$scope.holder)+d.data.data[0].orderamount;
	    
	    	$scope.newswapoffer.nearlegamount_1ccy = $filter('limitTo')(d.data.data[0].ccypair,$scope.holder);
			$scope.newswapoffer.nearlegamount_1 = d.data.data[0].orderamount;
			$scope.newswapoffer.farlegamount_1ccy = $filter('limitTo')(d.data.data[0].ccypair,$scope.holder);
			$scope.newswapoffer.farlegamount_1 = d.data.data[0].orderamount;
	})
	
	$scope.fill = function(){
		if($scope.newswapoffer.buysellbank == 'BUY' && $scope.newswapoffer.nearsellorderamount>0){
			$scope.newswapoffer.nearofferedrate = parseFloat($scope.newswapoffer.nearspotrate) - parseFloat($scope.newswapoffer.nearmagin/10000);
			$scope.newswapoffer.nearsellorderamount_disp = $filter('number')(($scope.newswapoffer.nearsellorderamount*$scope.newswapoffer.nearofferedrate),2);
		}else if($scope.newswapoffer.buysellbank == 'BUY' && $scope.newswapoffer.nearbuyorderamount>0){
			$scope.newswapoffer.nearofferedrate = parseFloat($scope.newswapoffer.nearspotrate) - parseFloat($scope.newswapoffer.nearmagin/10000);
			$scope.newswapoffer.nearbuyorderamount_disp = $filter('number')(($scope.newswapoffer.nearbuyorderamount/$scope.newswapoffer.nearofferedrate),2);
		}else if($scope.newswapoffer.buysellbank == 'SELL' && $scope.newswapoffer.nearsellorderamount>0){
			$scope.newswapoffer.nearofferedrate = parseFloat($scope.newswapoffer.nearspotrate) + parseFloat($scope.newswapoffer.nearmagin/10000);
			$scope.newswapoffer.nearsellorderamount_disp = $filter('number')(($scope.newswapoffer.nearsellorderamount/$scope.newswapoffer.nearofferedrate),2);
		}else if($scope.newswapoffer.buysellbank == 'SELL' && $scope.newswapoffer.nearbuyorderamount>0){
			$scope.newswapoffer.nearofferedrate = parseFloat($scope.newswapoffer.nearspotrate) + parseFloat($scope.newswapoffer.nearmagin/10000);
			$scope.newswapoffer.nearbuyorderamount_disp = $filter('number')(($scope.newswapoffer.nearbuyorderamount*$scope.newswapoffer.nearofferedrate),2);
		}
	}
	
	$scope.fill_far = function(){
		if($scope.newswapoffer.buysellbank == 'BUY' && $scope.newswapoffer.nearsellorderamount>0){
			$scope.newswapoffer.farofferedrate = parseFloat($scope.newswapoffer.farspotrate) + parseFloat($scope.newswapoffer.farmagin/10000);
			$scope.newswapoffer.farbuyorderamount_disp = $filter('number')(($scope.newswapoffer.farbuyorderamount*$scope.newswapoffer.farofferedrate),2);
		}else if($scope.newswapoffer.buysellbank == 'BUY' && $scope.newswapoffer.nearbuyorderamount>0){
			$scope.newswapoffer.farofferedrate = parseFloat($scope.newswapoffer.farspotrate) + parseFloat($scope.newswapoffer.farmagin/10000);
			$scope.newswapoffer.farsellorderamount_disp = $filter('number')(($scope.newswapoffer.farsellorderamount/$scope.newswapoffer.farofferedrate),2);
		}else if($scope.newswapoffer.buysellbank == 'SELL' && $scope.newswapoffer.nearsellorderamount>0){
			$scope.newswapoffer.farofferedrate = parseFloat($scope.newswapoffer.nearspotrate) - parseFloat($scope.newswapoffer.nearmagin/10000);
			$scope.newswapoffer.farbuyorderamount_disp = $filter('number')(($scope.newswapoffer.nearsellorderamount/$scope.newswapoffer.farofferedrate),2);
		}else if($scope.newswapoffer.buysellbank == 'SELL' && $scope.newswapoffer.nearbuyorderamount>0){
			$scope.newswapoffer.farofferedrate = parseFloat($scope.newswapoffer.farspotrate) - parseFloat($scope.newswapoffer.farmagin/10000);
			$scope.newswapoffer.farsellorderamount_disp = $filter('number')(($scope.newswapoffer.farsellorderamount*$scope.newswapoffer.farofferedrate),2);
		}
	}
		
	$scope.newswapOffer =function(){
		$scope.newswapoffer.offeredby = username;
				$http({
		              method: 'post',
		              url: '/new_swap_offer',
		              headers: {'Content-Type': 'application/json'},
		              data:{orderindex:$scope.newswapoffer.orderindex,orderidfk:$scope.newswapoffer.orderid,nearspotrate:$scope.newswapoffer.nearspotrate,nearmargin:$scope.newswapoffer.nearmagin,nearfinal:$scope.newswapoffer.nearofferedrate,
		              		nearbuyorderamountccy:$scope.newswapoffer.nearbuyorderamountccy_disp,nearbuyorderamount:$scope.newswapoffer.nearbuyorderamount_disp,nearsellorderamountccy:$scope.newswapoffer.nearsellorderamountccy_disp,nearsellorderamount:$scope.newswapoffer.nearsellorderamount_disp,
		              		neardate:$scope.newswapoffer.neardate,farspot:$scope.newswapoffer.farspotrate,farmargin:$scope.newswapoffer.farmagin,farfinal:$scope.newswapoffer.farofferedrate
		              	,farbuyorderamountccy:$scope.newswapoffer.farbuyorderamountccy_disp,farbuyorderamount:$scope.newswapoffer.farbuyorderamount_disp,farsellorderamountccy:$scope.newswapoffer.farsellorderamountccy_disp,farsellorderamount:$scope.newswapoffer.farsellorderamount_disp
		              	,fardate:$scope.newswapoffer.fardate,comment:$scope.newswapoffer.bankcomment,offeredby:domain,bankuser:username
		              }
		            }).success(function (data) {
		              alert("FxSwap Offer Submitted");
		              $scope.newswapoffer = {};
					  $state.go('homeswap');
		            }).error(function (err) {
		                alert("Error making Fxswap offer");
		                console.log(err)
		                //$scope.newswapoffer = {};
						//$state.go('homeswap');
		            });	
	}
       
});

app.controller('newmmofferCtrl', function($scope, $stateParams, $filter,$state,$http,$timeout, Data,ordersService) {
	var username = window.sessionStorage.getItem('bankuser');
	var domain = window.sessionStorage.getItem('bankdomain');
	var orderid = $stateParams.indexid;
	var indexid = $stateParams.indexid;
	$scope.Data = Data;
	$scope.Data.pagetitle = 'New MM order';
    $scope.newmmoffer = [];
    $scope.intdays = 365;
     
    ordersService.mmorder(indexid).then(function(d) {
	    $scope.newmmoffer = d.data.data[0];
	    $scope.newmmoffer.orderindex = d.data.data[0].orderindex;
	    $scope.newmmoffer.orderidfk = d.data.data[0].orderid;
	    $scope.newmmoffer.dealtype = d.data.data[0].mmtypebank;
	    $scope.Data.pagetitle = 'New '+ d.data.data[0].mmtypebank+' order';
	    //for interest rate currency days
	    ordersService.get_a_currency(d.data.data[0].ccy).then(function(d) {
	    	//console.log('CCy int days is '+d.data[0].intdays);
	    	$scope.intdays = d.data.data[0].intdays;
	    })
    })
    
    $scope.fill = function(){
    	$scope.newmmoffer.totalinterest = $filter('number')($scope.newmmoffer.orderamount * ($scope.newmmoffer.rate/100) * $scope.newmmoffer.tenuredays/$scope.intdays,2);
    	$scope.newmmoffer.totalinterest2 = $scope.newmmoffer.orderamount * ($scope.newmmoffer.rate/100) * $scope.newmmoffer.tenuredays/$scope.intdays;
    	$scope.newmmoffer.tax = $filter('number')(($scope.newmmoffer.orderamount * ($scope.newmmoffer.rate/100) * $scope.newmmoffer.tenuredays/$scope.intdays) * 0.15,2);
    	$scope.newmmoffer.tax2 = ($scope.newmmoffer.orderamount * ($scope.newmmoffer.rate/100) * $scope.newmmoffer.tenuredays/$scope.intdays) * 0.15;
    	$scope.newmmoffer.netinterest = $filter('number')(($scope.newmmoffer.orderamount * ($scope.newmmoffer.rate/100) * $scope.newmmoffer.tenuredays/$scope.intdays) - ($scope.newmmoffer.orderamount * ($scope.newmmoffer.rate/100) * $scope.newmmoffer.tenuredays/$scope.intdays) * 0.15,2);
    }
    
    $scope.newmmOffer = function(){
    	$scope.loading = true;
				$http({
		              method: 'post',
		              url: '/new_mm_offer',
		              headers: {'Content-Type': 'application/json'},
		              data:{orderindex:$scope.newmmoffer.orderindex,orderidfk:$scope.newmmoffer.orderidfk,fixedrate:$scope.newmmoffer.rate,orderamount:$scope.newmmoffer.orderamount,daycount:$scope.newmmoffer.tenuredays,
		              		totalinterest:$scope.newmmoffer.totalinterest2,tax:$scope.newmmoffer.tax2,netinterest:$scope.newmmoffer.netinterest,
		              		bankcomment:$scope.newmmoffer.bankcomment,offeredby:domain,bankuser:username}
		            }).success(function (data) {
		            	$timeout(function(){
		            		$scope.loading = false;
		            		alert("Offer Submitted");
		              		$scope.newmmoffer = {};
					  		$state.go('homemm');
		            	},300,true)
		              
		            }).error(function (error) {
		                alert("Error when making an offer");
		                //$scope.newmmoffer = {};
						//$state.go('homemm');
		            });	
		
		ordersService.updateordermm(indexid).then(function(d){
			//console.log(d);
		})
    }
});

app.controller('newforwardofferCtrl', function($scope,$state,$stateParams,$rootScope,$timeout,Data,$http,ordersService,$filter){
	var username = window.sessionStorage.getItem('username');
	var domain = window.sessionStorage.getItem('bankdomain');
	
	var orderid = $stateParams.indexid;
	var indexid = $stateParams.indexid;
	//$scope.Data = Data;
	//$scope.Data.pagetitle = 'New Forward Offer';
	$scope.newforwardoffer = {};
	
	
	ordersService.forwardorder(indexid).then(function(d) {
	    $scope.newforwardoffer = d.data.data[0];
	    $scope.newforwardoffer.orderindex = d.data.data[0].orderindex;
	    $scope.newforwardoffer.orderidfk = d.data.data[0].orderid;
	    $scope.newforwardoffer.offeredby = username;
	    $scope.newforwardoffer.buysell = d.data.data[0].buysell;
	    $scope.newforwardoffer.buysellbank = d.data.data[0].buysellbank;
	    $scope.newforwardoffer.buyorderamount = d.data.data[0].buyorderamount;
	    $scope.newforwardoffer.sellorderamount = d.data.data[0].sellorderamount;
	    $scope.newforwardoffer.buyorderamountccy = d.data.data[0].buyorderamountccy;
	    $scope.newforwardoffer.sellorderamountccy = d.data.data[0].sellorderamountccy;
	    
	}); 
	
	$scope.fill = function(){
		
		if($scope.newforwardoffer.buysellbank == 'BUY' && $scope.newforwardoffer.buyorderamount > 0){
			$scope.newforwardoffer.finalrate = parseFloat($scope.newforwardoffer.forwardrate) + parseFloat($scope.newforwardoffer.magin/100);
			$scope.newforwardoffer.settlementamount = $filter('number')(($scope.newforwardoffer.buyorderamount/$scope.newforwardoffer.finalrate),2);
			$scope.newforwardoffer.settlementamountccy = $filter('limitTo')($scope.newforwardoffer.ccypair,3);
		}else if($scope.newforwardoffer.buysellbank == 'BUY' && $scope.newforwardoffer.sellorderamount > 0){
			$scope.newforwardoffer.finalrate = $filter('number')(parseFloat($scope.newforwardoffer.forwardrate) - parseFloat($scope.newforwardoffer.magin/100),2);
			$scope.newforwardoffer.settlementamount = $filter('number')(($scope.newforwardoffer.sellorderamount*$scope.newforwardoffer.finalrate),2);
			$scope.newforwardoffer.settlementamountccy = $filter('limitTo')($scope.newforwardoffer.ccypair,-3);

		}else if($scope.newforwardoffer.buysellbank == 'SELL' && $scope.newforwardoffer.sellorderamount > 0){
			$scope.newforwardoffer.finalrate = $filter('number')(parseFloat($scope.newforwardoffer.forwardrate) + parseFloat($scope.newforwardoffer.magin/100),2);
			$scope.newforwardoffer.settlementamount = $filter('number')(($scope.newforwardoffer.sellorderamount/$scope.newforwardoffer.finalrate),2);
			$scope.newforwardoffer.settlementamountccy = $filter('limitTo')($scope.newforwardoffer.ccypair,3);
		}else if($scope.newforwardoffer.buysellbank == 'SELL' && $scope.newforwardoffer.buyorderamount > 0){
			$scope.newforwardoffer.finalrate = $filter('number')(parseFloat($scope.newforwardoffer.forwardrate) - parseFloat($scope.newforwardoffer.magin/100),2);
			$scope.newforwardoffer.settlementamount = $filter('number')(($scope.newforwardoffer.buyorderamount*$scope.newforwardoffer.finalrate),2);
			$scope.newforwardoffer.settlementamountccy = $filter('limitTo')($scope.newforwardoffer.ccypair,-3);
		}

	};

	$scope.newforwardOffer =function(){
		$scope.dataLoading = true;
				$http({
		              method: 'post',
		              url: './new_forward_offer',
		              headers: {'Content-Type': 'application/json'},
		              data:{orderindex:$scope.newforwardoffer.orderindex,orderidfk:$scope.newforwardoffer.orderidfk,spot:$scope.newforwardoffer.forwardrate,magin:$scope.newforwardoffer.magin,finalrate:$scope.newforwardoffer.finalrate,
		              		settlementdate:$scope.newforwardoffer.settlementdate,offeredby:domain,bankuser:username,settlementamountccy:$scope.newforwardoffer.settlementamountccy,settlementamount:$scope.newforwardoffer.settlementamount,
		              		bankcomment:$scope.newforwardoffer.bankcomment,bankuser:username}
		            }).success(function (data) {
		            	$timeout(function(){
		            		$scope.loading = false;
		            		alert("Forwad Offer Submitted");
		            		$scope.dataLoading = false;
		              		$scope.newforwardoffer = {};
					  		$state.go('homeforward');
		            	},300,true)
		            }).error(function (error) {
		                alert("Error when making an offer");
		                $scope.dataLoading = false;
		                //$scope.newforwardoffer = {};
						//$state.go('homeforward');
		            });	
		
		ordersService.updateforwardorder($scope.newforwardoffer.orderindex).then(function(d){
			//console.log(d);
		})
		            
	}
});