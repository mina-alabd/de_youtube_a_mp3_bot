var TelegramBot = require('node-telegram-bot-api');
var fs = require('fs');
var ytdl = require('ytdl-core');
var schedule = require('node-schedule');

var token = '1099075611:AAEVXhfCA-paAHAQNEdGMJGiS5OuvoXpf-Y';
// See https://developers.openshift.com/en/node-js-environment-variables.html
var port = process.env.OPENSHIFT_NODEJS_PORT;
var host = process.env.OPENSHIFT_NODEJS_IP;
var domain = process.env.OPENSHIFT_APP_DNS;

var dataFolder = process.env.OPENSHIFT_DATA_DIR;

var MS_PER_MINUTE = 60000;
var MAX_MINUTES_IN_SYSTEM = 5;

var URL_ERROR_MESSAGE = "El enlace no es válido. Por favor, envía un nuevo mensaje con un enlace válido de YouTube.";
var YOUTUBE_ERROR_MESSAGE = "Este bot se ejecuta en Estados Unidos y el autor de este vídeo lo ha bloqueado en esa región. Sentimos las molestias.";
var DOWNLOADING = "El mp3 del vídeo se está descargando...";

var bot = new TelegramBot(token, {
    webHook: {
        port: port,
        host: host
    }
});
// OpenShift enroutes :443 request to OPENSHIFT_NODEJS_PORT
bot.setWebHook(domain + ':443/bot' + token);

bot.on('message', function (msg) {
    
    var chatId = msg.chat.id;
    
    var userMsg = msg.text;
    console.log(userMsg);
                                                                    
    var url_validation = userMsg.test(/(https?:\/\/)?(www\\.)?(yotu\\.be\/|youtube\\.com\/)?((.+\/)?(watch(\\?v=|.+&v=))?(v=)?)([\\w_-]{11})(&.+)?/);
                                                                    
    if(url_validation) {
        bot.sendMessage(chatId, "Validado");
    }
    else {
        bot.sendMessage(chatId, "No validado");
    }
    
    ytdl.getInfo(userMsg, function(err, info) {

        if(typeof info === 'undefined') {
            bot.sendMessage(chatId, YOUTUBE_ERROR_MESSAGE);
        }
        else {

            var download = ytdl(userMsg, { filter: "audioonly" })
                .pipe(fs.createWriteStream(dataFolder + info.title + '.mp3'));

            bot.sendMessage(chatId, DOWNLOADING);

            download.on('finish', function() {
                bot.sendAudio(chatId, dataFolder + info.title + '.mp3');
            });
        }

    });

});

schedule.scheduleJob('*/10 * * * *', function() {
    var date = new Date();
    
    var hour = date.getHours();
    var minutes = date.getMinutes();
    
    console.log('[' + hour + ':' + minutes + '] Comienzo del proceso de borrado de archivos obsoletos.');
    
    fs.readdir(dataFolder, function(err, items) {
        var timeNow = new Date();

        for (var i=0; i<items.length; i++) {
            
            var fileModifiedTime = new Date(fs.statSync(dataFolder + items[i]).mtime.getTime());
            var dateToCompare = new Date(fileModifiedTime.getTime() + MAX_MINUTES_IN_SYSTEM * MS_PER_MINUTE);
                
            if(dateToCompare.getTime() < timeNow.getTime() && items[i].charAt(0) != '.') {
                fs.unlinkSync(dataFolder + items[i]);
                console.log("Borrado automático del archivo " + items[i]);
            }
            
            console.log('Finalizado el proceso de borrado de archivos obsoletos.')
        }
    });
});
