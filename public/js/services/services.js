var app = angular.module('marginService', []);

app.service('AuthService', function($q, $http,API_ENDPOINT) {
  var LOCAL_TOKEN_KEY = 'yourTokenKey';
  var isAuthenticated = false;
  var authToken;
 
  function loadUserCredentials() {
    var token = window.localStorage.getItem(LOCAL_TOKEN_KEY);
    if (token) {
      useCredentials(token);
    }
  }
 
  function storeUserCredentials(token) {
    window.localStorage.setItem(LOCAL_TOKEN_KEY, token);
    useCredentials(token);
  }
 
  function useCredentials(token) {
    isAuthenticated = true;
    authToken = token;
 
    // Set the token as header for your requests!
    $http.defaults.headers.common.Authorization = authToken;
  }
 
  function destroyUserCredentials() {
    authToken = undefined;
    isAuthenticated = false;
    $http.defaults.headers.common.Authorization = undefined;
    window.localStorage.removeItem(LOCAL_TOKEN_KEY);
  }
 
  var register = function(user) {
    return $q(function(resolve, reject) {
      $http.post(API_ENDPOINT.url + '/signup', user).then(function(result) {
        if (result.data.success) {
          resolve(result.data.msg);
        } else {
          reject(result.data.msg);
        }
      });
    });
  };

  var newuser = function(user) {
    return $q(function(resolve, reject) {
      $http.post(API_ENDPOINT.url + '/newuser', user).then(function(result) {
        if (result.data.success) {
          resolve(result.data.msg);
        } else {
          reject(result.data.msg);
        }
      });
    });
  };
 
  var login = function(user) {
    return $q(function(resolve, reject) {
      $http.post(API_ENDPOINT.url + '/authenticate', user).then(function(result) {
        if (result.data.success) {
          storeUserCredentials(result.data.token);
          resolve(result.data.msg);
        } else {
          reject(result.data.msg);
        }
      });
    });
  };
 
  var logout = function() {
    destroyUserCredentials();
  };
 
  loadUserCredentials();
 
  return {
    login: login,
    register: register,
    newuser:newuser,
    logout: logout,
    isAuthenticated: function() {return isAuthenticated;},
  };
});

app.factory('socketio', function ($rootScope) {
    var socket = io.connect();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});

app.factory('ordersService', function($http){
	var myService = {
			updateorder: function(orderindex) {
			      var promise = $http({
			      		method:'POST',
			      		url:'/updateorder',
			      		headers: {'Content-Type': 'application/json'},
			      		data:{orderindex:orderindex}
			      }).success(function (response) {
			        		return response;
			      		}).error(function(err){
			      			console.log("Error: "+err);
			      		});
			      return promise;
			    },
			    updateforwardorder: function(orderindex) {
			      var promise = $http({
			      		method:'POST',
			      		url:'/updateforwardorder',
			      		headers: {'Content-Type': 'application/json'},
			      		data:{orderindex:orderindex}
			      }).success(function (response) {
			        		return response;
			      		}).error(function(err){
			      			console.log("Error: "+err);
			      		});
			      return promise;
			    },
			    updateOffersQuery: function(offerid) {
				      var promise = $http({
				      		method:'POST',
				      		url:'/accept_offer',
				      		headers: {'Content-Type': 'application/json'},
				      		data:{offerid:offerid}
				      }).success(function (response) {
				        		return response;
				      		}).error(function(err){
				      			console.log("Error: "+err);
				      		});
				      return promise;
				},
				updateForwardQuery: function(offerid) {
				      var promise = $http({
				      		method:'POST',
				      		url:'/accept_forward_offer',
				      		headers: {'Content-Type': 'application/json'},
				      		data:{offerid:offerid}
				      }).success(function (response) {
				        		return response;
				      		}).error(function(err){
				      			console.log("Error: "+err);
				      		});
				      return promise;
				},
				    updateOrdersQuery: function(orderid) {
					      var promise = $http({
					      		method:'POST',
					      		url:'/accept_offer1',
					      		headers: {'Content-Type': 'application/json'},
					      		data:{orderid:orderid}
					      }).success(function (response) {
					        		return response;
					      		}).error(function(err){
					      			console.log("Error: "+err);
					      		});
					      return promise;
					},
					updateOrdersQueryforward: function(orderid) {
					      var promise = $http({
					      		method:'POST',
					      		url:'/accept_forward_offer1',
					      		headers: {'Content-Type': 'application/json'},
					      		data:{orderid:orderid}
					      }).success(function (response) {
					        		return response;
					      		}).error(function(err){
					      			console.log("Error: "+err);
					      		});
					      return promise;
					},
			      offer: function(offerid) {
			        var promise = $http({
			        		method:'GET',
			        		url:'/get_offer/'+ offerid,
			        		headers: {'Content-Type': 'application/json'}
			        }).success(function (response) {
			          		return response;
			        }).error(function(err){
			        		console.log("Error: "+err);
			        });
			        return promise;
			      },
			      forwardoffer: function(offerid) {
			        var promise = $http({
			        		method:'GET',
			        		url:'/get_forward_offer/'+ offerid,
			        		headers: {'Content-Type': 'application/json'}
			        }).success(function (response) {
			          		return response;
			        }).error(function(err){
			        		console.log("Error: "+err);
			        });
			        return promise;
			      },
			      offerdetails: function(x) {
			          var promise = $http({
			          		method:'GET',
			          		url:'/get_an_offer/'+x,
			          		headers: {'Content-Type': 'application/json'}
			      //    	params:{id:x}
			          }).success(function (response) {
			          			//console.log(response);
			            		return response;
			          		}).error(function(error){
			          			console.log("Error: "+error);
			          		});
			          return promise;
			        },
			        forwardofferdetails: function(x) {
			          var promise = $http({
			          		method:'GET',
			          		url:'/get_a_forward_offer/'+x,
			          		headers: {'Content-Type': 'application/json'}
			      //    	params:{id:x}
			          }).success(function (response) {
			          			//console.log(response);
			            		return response;
			          		}).error(function(error){
			          			console.log("Error: "+error);
			          		});
			          return promise;
			        },
			      all_offers: function(username) {
			          var promise = $http({
			          		method:'GET',
			          		url:'/all_offers_test',
			          		headers: {'Content-Type': 'application/json'},
			          		params:	 {id:username}
			          }).success(function (response) {
			            	return response;
			          }).error(function(err){
			          		console.log("Error on /all_offers ", err);
			          });
			          return promise;
			        },
			        accepted_offers: function(username) {
			            var promise = $http({
			            		method:'GET',
			            		url:'/accepted_offers',
			            		headers: {'Content-Type': 'application/json'},
			            		params:	 {id:username}
			            }).success(function (response) {
			            		//console.log(response);
			              	return response;
			            }).error(function(error){
			            		alert("Error: "+ error);
			            });
			            return promise;
			          },
			          accepted_buy_offers: function(username) {
			              var promise = $http({
			              		method:'GET',
			              		url:'/accepted_buy_offers',
			              		headers: {'Content-Type': 'application/json'},
			              		params:	 {id:username}
			              }).success(function (response) {
			              		//console.log(response);
			                	return response;
			              }).error(function(error){
			              		alert("Error: "+ error);
			              });
			              return promise;
			            },
			            accepted_forward_offers: function(username) {
			              var promise = $http({
			              		method:'GET',
			              		url:'/accepted_forward_offers',
			              		headers: {'Content-Type': 'application/json'},
			              		params:	 {id:username}
			              }).success(function (response) {
			              		//console.log(response);
			                	return response;
			              }).error(function(error){
			              		console.log("Error: "+ error);
			              });
			              return promise;
			            },
			            accepted_swap_offers: function(username) {
			                var promise = $http({
			                		method:'GET',
			                		url:'/accepted_swap_offers',
			                		headers: {'Content-Type': 'application/json'},
			                		params:	 {id:username}
			                }).success(function (response) {
			                  	return response;
			                }).error(function(error){
			                		alert("Error: "+ error);
			                });
			                return promise;
			           },
			           to_confirm_offers: function(x) {
			        	      var promise = $http({
			        	      		method:'GET',
			        	      		url:'/to_confirm_offers',
			        	      		headers: {'Content-Type': 'application/json'},
			        	      		params:	 {id:x}
			        	      }).success(function (response) {
			        	        	return response;
			        	      }).error(function(error){
			        	      		alert("Error: "+ error);
			        	      });
			        	      return promise;
			          },
			          confirmed_offers: function(x) {
				      var promise = $http({
				      		method:'GET',
				      		url:'/confirmed_offers',
				      		headers: {'Content-Type': 'application/json'},
				      		params:	 {id:x}
				      }).success(function (response) {
				      		console.log(response);
				        	return response;
				      }).error(function(error){
				      		alert("Error: "+ error);
				      });
				      return promise;
				    },
				    confirmed_swap_offers: function(x) {
				      var promise = $http({
				      		method:'POST',
				      		url:'/confirmed_swap_offers',
				      		headers: {'Content-Type': 'application/json'},
				      		params:	 {id:x}
				      }).success(function (response) {
				      		console.log(response);
				        	return response;
				      }).error(function(error){
				      		alert("Error: "+ error);
				      });
				      return promise;
				    },
				    confirmed_mm_offers: function(x) {
				      var promise = $http({
				      		method:'POST',
				      		url:'/confirmed_mm_offer',
				      		headers: {'Content-Type': 'application/json'},
				      		params:	 {id:x}
				      }).success(function (response) {
				      		console.log(response);
				        	return response;
				      }).error(function(error){
				      		alert("Error: "+ error);
				      });
				      return promise;
				    },
				    getbanks: function() {
				      var promise = $http({
				      		method:'GET',
				      		url:'/banks',
				      		headers: {'Content-Type': 'application/json'}
				      }).success(function (response) {
				      			//console.log(response);
				        		return response;
				      		}).error(function(error){
				      			console.log("Error: "+error);
				      		});
				      return promise;
				    },
				    getmybanks: function() {
				      var promise = $http({
				      		method:'GET',
				      		url:'/mybanks/customer1',
				      		headers: {'Content-Type': 'application/json'}
				      }).success(function (response) {
				        		return response;
				      		}).error(function(error){
				      			console.log("Error: "+error);
				      		});
				      return promise;
				    },
				    getcurrency: function() {
				      var promise = $http({
				      		method:'GET',
				      		url:'/currencies',
				      		headers: {'Content-Type': 'application/json'}
				      }).success(function (response) {
				        		return response;
				      		}).error(function(error){
				      			console.log("Error: " + error);
				      		});
				      return promise;
				    },
				    swaporder: function(indexid) {
				      var promise = $http({
				      		method:'GET',
				      		url:'/get_swap_order/' + indexid,
				      		headers: {'Content-Type': 'application/json'}
				      		//params:{id:indexid}
				      }).success(function (response) {
				        		return response;
				      		}).error(function(error){
				      			console.log("Error: "+error);
				      		});
				      return promise;
				    },
				    forwardorder: function(indexid) {
				      var promise = $http({
				      		method:'GET',
				      		url:'./get_forward_order/'+indexid,
				      		headers: {'Content-Type': 'application/json'}
				      }).success(function (response) {
				        		return response;
				      		}).error(function(error){
				      			console.log(error);
				      		});
				      return promise;
				    },
				    mmorder: function(indexid) {
				      var promise = $http({
				      		method:'GET',
				      		url:'/get_mm_order/'+indexid,
				      		headers: {'Content-Type': 'application/json'}
				      		//params:{id:indexid}
				      }).success(function (response) {
				      			//console.log(response);
				        		return response;
				      		}).error(function(error){
				      			console.log("Error: "+error);
				      		});
				      return promise;
				    },
				    get_a_currency: function(ccy) {
				      var promise = $http({
				      		method:'GET',
				      		url:'/get_a_currency/'+ ccy,
				      		headers: {'Content-Type': 'application/json'}
				      		//params:{ccy:x}
				      }).success(function (response) {
				      			//console.log(response);
				        		return response;
				      		}).error(function(error){
				      			console.log("Error: "+error);
				      		});
				      return promise;
				    },
				    updateordermm: function(orderindex) {
				      var promise = $http({
				      		method:'post',
				      		url:'/updateordermm',
				      		headers: {'Content-Type': 'application/json'},
				      		data:{orderindex:orderindex}
				      }).success(function (response) {
				      			//console.log(response);
				        		return response;
				      		}).error(function(error){
				      			console.log("Error: "+error);
				      		});
				      return promise;
				    },
				    offer_s_mm: function(x) {
				      var promise = $http({
				      		method:'GET',
				      		url:'/get_s_mm_offer',
				      		headers: {'Content-Type': 'application/json'},
				      		params:{id:x}
				      }).success(function (response) {
				      			console.log(response);
				        		return response;
				      }).error(function(error){
				      			console.log("Error: "+error);
				      });
				      return promise;
				    }
	};
	
	return myService;
	
});

app.factory('Data', function () {

    var data = {
        pagetitle: ''
    };

    return {
        getFirstName: function () {
            return data.pagetitle;
        },
        setFirstName: function (pagetitle) {
            data.pagetitle = pagetitle;
        }
    };
});
