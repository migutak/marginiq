var app = angular.module('backoffice.controller', ['marginService']);

app.controller('backofficeCtrl',function($scope, ordersService) {
	$scope.confirmedoffers = [];
	$scope.confirmedswapoffers = [];
	$scope.confirmedforwardoffers = [];
	$scope.confirmedmmoffers = [];
	
	
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

    ordersService.confirmed_forward_bo().then(function(d){
        $scope.confirmedforwardoffers = d.data.data
    })
})