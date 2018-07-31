angular.module('rallly')
.controller('VerificationCtrl', function(Event, Notification, $state){
    Event.verify({id : $state.params.id, code :$state.params.code}, function(){
        var notification = new Notification({
            title : 'Email Verified',
            message : 'Votre mail a été vérifié. Vous pourrez désormais recevoir des notifications par e-mail pour cet événement',
            type : 'success',
            timeout : 5000
        });
    }, function(e){
        var notification = new Notification({
            title : 'Verification Failed',
            message : 'Your verification code has expired.',
            type : 'error'
        });
    });
    $state.go('event', { id : $state.params.id }, {
        location : "replace"
    });

});
