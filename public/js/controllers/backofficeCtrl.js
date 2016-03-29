var app = angular.module('backoffice.controller', ['marginService']);

app.controller('backofficeCtrl',function($scope, ordersService, socketio) {
	$scope.confirmedoffers = [];
	$scope.confirmedswapoffers = [];
	$scope.confirmedforwardoffers = [];
	$scope.confirmedmmoffers = [];

    $scope.confirmedforwardoffers_notification = 0;
    $scope.confirmedmmoffers_notification = 0;
    $scope.confirmedswapoffers_notification = 0;
    $scope.total_notification = 0;

    confirmed_forward_bo();
    confirmed_offers();
    confirmed_mm_offers();

    socketio.on('accept_forward_deal', function(msg){
        confirmed_forward_bo();
       // Notification.success({message: msg.buysell+' '+msg.ccypair+'<br><b>'+ msg.usernamefk+'</b><br><a href="#/homemm">Make an Offer</a>', title: 'MarginIQ',positionY: 'bottom', positionX: 'right', delay: null});
    });

    socketio.on('accept_spot_deal', function(msg){
        confirmed_offers();
    });
	
	function confirmed_offers(){
        ordersService.confirmed_offers().then(function(d){
            $scope.confirmedoffers = d.data.data;
            $scope.confirmedoffers_notification = d.data.data.length;
            add();
        })
    }
    
    function confirmed_swap_offers(){
        ordersService.confirmed_swap_offers().then(function(d){
            $scope.confirmedswapoffers = d.data
        })
    }
    
    
    function confirmed_mm_offers(){
        ordersService.confirmed_mm_offers().then(function(d){
            $scope.confirmedmmoffers = d.data.data;
            $scope.confirmedmmoffers_notification = d.data.data.length;
        })
    }
    

    function confirmed_forward_bo(){
        ordersService.confirmed_forward_bo().then(function(d){
            $scope.confirmedforwardoffers = d.data.data
            $scope.confirmedforwardoffers_notification = d.data.data.length;
            add();
        }) 
    }

    function add(){
        $scope.total_notification = $scope.confirmedoffers_notification + $scope.confirmedforwardoffers_notification + $scope.confirmedmmoffers_notification + $scope.confirmedswapoffers_notification
    }   
})