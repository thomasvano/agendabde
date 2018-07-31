/*
    Email Notifications Helper Class
*/

var app = require('../app');
var communicator = require('../communicator');
var debug = require('debug')('rallly');
var nodemailer = require('nodemailer');
var hbs = require('nodemailer-express-handlebars');

var transportConfig = {
    auth: {
        user: app.get('smtpUser'),
        pass: app.get('smtpPwd')
    }
};

// create reusable transporter object
if (app.get('smtpService')) {
    transportConfig.service = app.get('smtpService')
} else {
    transportConfig.host = app.get('smtpHost');
    transportConfig.port = app.get('smtpPort');
    transportConfig.secure = app.get('smtpSecure');
}
let transporter = nodemailer.createTransport(transportConfig);
var hbsOpts = {
    viewEngine: 'express-handlebars',
    viewPath: 'views/emails'
};
transporter.use('compile', hbs(hbsOpts));

// verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        debug(error);
    } else {
        debug('Server is ready to take our messages');
    }
});

var sendEmail = function (options) {
    let mailOptions = {
        from: app.get('smtpFrom'),
        to: options.to,
        subject: options.subject,
        template: 'email',
        context: {
            buttonText: options.buttonText,
            buttonURL: options.buttonURL,
            message: options.message,
            title: options.title
        }
    };
    if (options.replyto) {
        mailOptions.replyTo = options.replyto;
    }

    return transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return debug(error);
        }
        debug('Message %s sent: %s', info.messageId, info.response);
    });
};

communicator.on('event:create', function (event) {
    sendInvites(event);
    if (!event.creator.allowNotifications || event.isClosed || event.isExample) return;
    sendEmailConfirmation(event);
});

communicator.on('event:update:creator.email', function (event, oldEvent) {
    if (!event.creator.allowNotifications || event.isClosed || event.isExample) return;
    verifyEmail(event);
});

communicator.on('participant:add', function (event, participant) {
    if (!event.creator.allowNotifications || !event.creator.isVerified || event.isExample) return;
    sendNewParticipantNotification(event, participant);
});

communicator.on('comment:add', function (event, comment) {
    if (!event.creator.allowNotifications || !event.creator.isVerified || event.isExample) return;
    sendNewCommentNotification(event, comment);
});

// Send confirmation to the creator of the event with a link to verify the creators email address
var sendEmailConfirmation = function (event) {
    sendEmail({
        to: event.creator.email,
        subject: 'AgendaBDE: ' + event.title + ' - Vérification de l\'adresse e-mail',
        title: 'Votre event ' + event.title + ' a été créé avec succès.',
        buttonText: 'Vérification de l\'adresse e-mail',
        buttonURL: app.get('absoluteUrl')('verify/' + event._id + '/code/' + event.__private.verificationCode),
        message: `Hi ${event.creator.name},<br /><br />` +
            'Un email a été envoyé à chaque participant avec un lien vers l\'événement.<br /><br />' +
            'Important: Pour continuer à recevoir des notifications par e-mail concernant cet event, veuillez cliquer sur le bouton ci-dessous pour valider votre adresse e-mail.'
    });
}

// Send an invite to all participants of the evnet
var sendInvites = function (event) {
    event.emails.forEach(function (item) {
        sendEmail({
            to: item.email,
            subject: 'AgendaBDE: ' + event.title,
            title: event.creator.name + ' vous a invité à participer à leur event: ' + event.title,
            replyto: event.creator.email,
            buttonText: 'Voir l\'Event',
            buttonURL: app.get('absoluteUrl')(event._id),
            message: 'AgendaBDE est un outil de planification collaborative gratuit qui vous permet, ainsi qu\'à votre team, de voter sur une date pour organiser un événement. ' +
                'Clique sur le bouton ci-dessous pour visiter la page de l\'event et voter sur les dates qui vous conviennent le mieux.'
        });
    });
}

// This message is sent when the user want to verify an email address after the event has been created
var verifyEmail = function (event) {
    sendEmail({
        to: event.creator.email,
        subject: 'AgendaBDE: ' + event.title + ' - Vérification de l\’adresse e-mail',
        title: 'Veuillez vérifier votre adresse email pour recevoir les mises à jour de cet événement.',
        buttonText: 'Vérifier l\'adresse e-mail',
        buttonURL: app.get('absoluteUrl')('verify/' + event._id + '/code/' + event.__private.verificationCode),
        message: `Bonjour ${event.creator.name},<br /><br />` +
            'Si vous souhaitez recevoir des mises à jour par email de cet event, cliquer sur le bouton ci-dessous pour confirmer votre adresse email.'
    });
}

var sendNewParticipantNotification = function (event, participant) {
    sendEmail({
        to: event.creator.email,
        subject: 'AgendaBDE: ' + event.title + ' - Nouveau Participant',
        title: participant.name + ' a voté!',
        buttonText: 'Voir l\'Event',
        buttonURL: app.get('absoluteUrl')(event._id),
        message: `Bonjour ${event.creator.name},<br /><br />` +
            'Clique sur le bouton ci-dessous pour voir les mises à jour apportées à la page de votre event!'
    });
}
var sendNewCommentNotification = function (event, comment) {
    sendEmail({
        to: event.creator.email,
        subject: 'AgendaBDE: ' + event.title + ' - Nouveau Commentaire',
        title: comment.author.name + ' has commented on your event!',
        buttonText: 'Voir l\'Event',
        buttonURL: app.get('absoluteUrl')(event._id),
        message: `Hi ${event.creator.name},<br /><br />` +
            'Clique sur le bouton ci-dessous pour voir les mises à jour apportées à la page de votre event!'
    });
}
