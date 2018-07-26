angular.module('rallly')
.controller('HomeCtrl', function($scope, $state, Title){
    Title.set('Agenda BDE')

    $scope.newEvent = function(){
        $state.go('newevent');
    }
});
