ep_base
=======

A plugin that allows you to authenticate users based on their Discord user id or
their membership in guilds (servers) and roles in those guilds.

# Installing

1. Install this plugin:

Cloneing this repository from github

    pnpm install PATH/TO/THIS/FOLDER

or

    pnpm plugins install ep_discordauth

2. Setup a Discord Application

You will need to set up an Application in the Discord Developers Portal at

    discord.com/developers

From the developer portal grab your applications OAuth2 Client ID and Client Secret

3. Update settings.json

In your settings you will need to set/update the following:


    "requireAuthentication": true,
    "requireAuthorization": true,
    "ep_discordauth": {
      "client_id":"YOUR_APPS_CLIENT_IDFROM_STEP_2",
      "client_secret":"YOUR_APPS_CLIENT_SECRET_FROM_STEP_2",
      "authorizedUsers": {
        "individuals": ["discord_id_of_accepted_users"],
        "guilds":{
          "guild_id_of_accepted_users" : { "roles" : ["ids_of_roles_to_grant_permissions_to"] }
        }
      },
      "admins":{
        "individuals":["discord_id_of_admin_users"],
         "guilds":{
           "guild_id_of_admin_users" : { "roles" : ["ids_of_roles_to_grant_permission_to"] }
         }
      },
      "excluded":{
        "individuals":["discod_id_of_banned_users"],
        "guilds":{
            "guild_id_of_banned_users": {"roles":["ids_of_roles_to_revoke_all_permissions_from"]}
        }
      }
    }

Any persons listed in the `individuals` or in one of the `roles` list of one of
the guilds listed under `authorizedUsers` will be able to access pads on etherpad.
Any person listed in the same way under `admins` will have access to /admin.
Anyone in the `excluded` section will have both types of access removed.

To get the discord ids of users, guilds and roles, activate "Developer Mode"
([Settings]->[Advanced]->[Developer mode]) in your discord client. If you right
click a user, guild or role (in the guilds server options) you can copy it's ID
from there.

