var app = angular.module('backoffice.controller', ['marginService']);

app.controller('backofficeCtrl',function($scope, ordersService, socketio) {
	$scope.confirmedoffers = [];
	$scope.confirmedswapoffers = [];
	$scope.confirmedforwardoffers = [];
	$scope.confirmedmmoffers = [];

    $scope.confirmedforwardoffers_notification = 0;

    confirmed_forward_bo();

    socketio.on('accept_forward_deal', function(msg){
        confirmed_forward_bo();
       // Notification.success({message: msg.buysell+' '+msg.ccypair+'<br><b>'+ msg.usernamefk+'</b><br><a href="#/homemm">Make an Offer</a>', title: 'MarginIQ',positionY: 'bottom', positionX: 'right', delay: null});
    });
	
	
    ordersService.confirmed_offers().then(function(d){
    	//console.log(d.data);
    	$scope.confirmedoffers = d.data.data
    })
    
    /*ordersService.confirmed_swap_offers().then(function(d){
    	$scope.confirmedswapoffers = d.data
    })
    
    ordersService.confirmed_mm_offers().then(function(d){
    	$scope.confirmedmmoffers = d.data
    })*/

function confirmed_forward_bo(){
    ordersService.confirmed_forward_bo().then(function(d){
        $scope.confirmedforwardoffers = d.data.data
        $scope.confirmedforwardoffers_notification = d.data.data.length;
    }) 
}

   
})