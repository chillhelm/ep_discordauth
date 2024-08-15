const express = require("express");
const sessions = require("express-session");
const db = require('ep_etherpad-lite/node/db/DB').db;
const {request} = require('undici');
var settings = require('ep_etherpad-lite/node/utils/Settings');
var pluginSettings = settings.ep_discordauth;
const cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

function makesecret(length) {
	    let result = '';
	    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	    const charactersLength = characters.length;
	    let counter = 0;
	    while (counter < length) {
		          result += characters.charAt(Math.floor(Math.random() * charactersLength));
		          counter += 1;
		        }
	    return result;
}

express_session_secret = makesecret(16);
const oneDay = 1000 * 60 * 60 * 24;

exports.expressCreateServer = function(hook, context){
    console.log("ep_discordauth called index.js:expressCreateServer");
    context.app.get("/discordauth/callback", async (req, res) => {
	    let auth_code = req.query.code;
        let sessionID = req.sessionID;
        let callbackUrl = `${req.protocol}://${req.get('host')}/discordauth/callback`
        db.get(`oauthstate:${req.sessionID}`, async (k, state) => {;
            if (req.query.state != state) {
                console.log("ep_discordauth state inconsistent!");
                res.redirect("/discordauth/logout");
            } else {
                if(auth_code) {
                    console.log(`Client ID: ${pluginSettings.client_id}
                        Client Secret: ${pluginSettings.client_secret} `);
                    const tokenResponseData = await request('https://discord.com/api/oauth2/token', {
                        method: 'POST',
                        body: new URLSearchParams({
                            client_id: pluginSettings.client_id,
                            client_secret: pluginSettings.client_secret,
                            code: auth_code,
                            grant_type: 'authorization_code',
                            redirect_uri: `${callbackUrl}`,
                            state: sessionID,
                            scope: 'identify+guilds+guilds.members.read' }).toString(),
                        headers: {
                            'Content-Type':'application/x-www-form-urlencoded'
                        }
                    });
                    const oauthData = await tokenResponseData.body.json();
                    console.log("ep_discordauth oauthData:", oauthData);
                    const userResult = await request('https://discord.com/api/users/@me', {
                    headers: {
                        authorization: `${oauthData.token_type} ${oauthData.access_token}`,
                    },
                    });
                    userData = await userResult.body.json();
                    let permission = false;
                    let admin = false;
                    individualAuthorizedUsers = pluginSettings.authorizedUsers.individuals;
                    if(individualAuthorizedUsers && individualAuthorizedUsers.forEach) {
                        for (authId of individualAuthorizedUsers) {
                            if(authId == userData.id)
                                permission = true;
                        }
                    }
                    for(guild_id of guilds) {
                        const guildRoleResult = await request(`https://discord.com/api/users/@me/guilds/${guild_id}/member`,{
                            headers: {
                                authorization: `${oauthData.token_type} ${oauthData.access_token}`,
                            },
                        });
                        guildRoles = await guildRoleResult.body.json();
                        console.log("ep_discordauth guildRoles.roles",guildRoles.roles);
                        if(guildRoles.roles && guildRoles.roles.forEach) {
                            guildRoles.roles.forEach(function(r_id) {
                                if(r_id == '1217076171980804156')
                                    permission = true;
                            });
                        }
                    }
                    if(permission) {
                        console.log("ep_discordauth Der hat die Etherpadnutzer erlaubnis!");
                    } else {
                        console.log("ep_discordauth Der hat nicht die Etherpadnutzer erlaubnis!");
                    }
                    if(userData.id == '223517737861906433') {
                        console.log("ep_discordauth das ist der boss!");
                        permission = true;
                        admin = true;
                    }
                    if(userData.username && userData.discriminator && userData.id && (permission||admin)) {
                        console.log(`ep_discordauth Database Write -> oauth:${sessionID}`, '---', userData);
                        db.set(`oauth:${sessionID}`, userData);
                        db.set(`oauth_admin:${sessionID}`, admin);
                        res.redirect(req.session.preAuthReqUrl || '/');
                    } else {
                        res.redirect("/discordauth/logout");
                    }
                }
            }
        });
    });
    context.app.get("/discordauth/login", async (req, res) => {
        let sessionID = req.sessionID;
        console.log("ep_discordauth req.session",req.session);
        req.session.state=makesecret(16)
        let callbackUrl = `${req.protocol}://${req.get('host')}/discordauth/callback`
        db.set(`oauthstate:${req.sessionID}`, req.session.state);
        var responsePage = `
            <html>
                <body>
                Please log in through discord: <a href="https://discord.com/oauth2/authorize?client_id=${pluginSettings.client_id}&response_type=code&redirect_uri=${callbackUrl}&scope=identify+guilds+guilds.members.read&state=${req.session.state}"> Discord Authentication </a>
                </body>
            </html>`
        res.send(responsePage);
    });
    context.app.get("/discordauth/logout", async (req, res) => {
        let sessionID = req.sessionID;
        db.set(`oauth:${sessionID}`, undefined);
        db.set(`oauthredirectlookup:${sessionID}`, undefined);
        db.set(`oauth_admin:${sessionID}`, undefined);
        db.set(`oauthstate:${sessionID}`, undefined);
        req.session.destroy((err)=>{console.log("ep_discordauth error when destroying user session: ", err)});
        res.redirect("/discordauth/login");
    });
}

exports.authenticate = function(hook, context, cb) {
    console.log("ep_discordauth called index.js:authenticate");
    let userIsAuthedAlready = false;
    console.log(`ep_discordauth Database lookup -> oauth:${context.req.sessionID}`);
    db.get(`oauth:${context.req.sessionID}`, (k, user) => {
        console.log(`ep_discordauth Oauth session found ->${context.req.sessionID}`, 'has user data of ', user);
        if (user) {
            userIsAuthedAlready = true;
            console.log(user);
            context.req.session.user = context.users[user.username] || user;
            console.log("context user", context.req.session.user)
            db.get(`oauth_admin:${context.req.sessionID}`, (k, admin) => {
                console.log("der ist admin", admin);
                context.req.session.user.is_admin = admin;
            });
            cb(true);
        } else {
            context.req.session.preAuthReqUrl = context.req.url;
            cb(false);
        }
    });
}

exports.authnFailure = function(hook, context, cb) {
    context.res.redirect('/discordauth/login');
    return cb([true]);
}

exports.preAuthorize = async function(hook, context) {
    console.log("ep_discordauth preAuthorize",context.req.url)
    if(context.req.url.indexOf("/discordauth/callback")===0) return true;
    if(context.req.url.indexOf("/discordauth/login")===0) return true;
    if(context.req.url.indexOf("/discordauth/logout")===0) return true;
}

exports.authorize = function(hook, context, cb){
    console.log("ep_discordauth called index.js:authorize");
    let userIsAuthedAlready = false;
    console.log(`ep_discordauth Database lookup -> oauth:${context.req.sessionID}`);
    db.get(`oauth:${context.req.sessionID}`, (k, user) => {
        console.log(`ep_discordauth Oauth session found ->${context.req.sessionID}`, 'has user data of ', user);
        if (user) userIsAuthedAlready = true;
        cb(userIsAuthedAlready);
    });

}

