import { VoteData } from '../types';
import firebase from 'firebase';

const keys = ['apiKey', 'appId', 'authDomain', 'databaseURL', 'measurementId', 'messagingSenderId', 'projectId', 'storageBucket']

class Databases {
    guilds: firebase.database.Database;
    users: firebase.database.Database;
    logs: firebase.database.Database;
    api: firebase.database.Database;

    constructor() {
        this.guilds = this.initializeDatabase('GuildsDB');
        this.users = this.initializeDatabase('UsersDB');
        this.logs = this.initializeDatabase('LogsDB');
        this.api = this.initializeDatabase('ApiDB');

        // Clean up old tokens
        setInterval(async() => {
            const logs = await this.getLogs();

            for(const [key, value] of Object.entries(logs) as [string, any][]) {
                if(value.expires_in <= Date.now()) {
                    await this.deleteToken(key);
                }
            }
        }, 1000 * 60 * 60);
    }

    initializeDatabase(name: string): firebase.database.Database {
        let app = firebase.apps.find((app: firebase.app.App) => app.name == name);

        if(!app) {
            app = firebase.initializeApp(Databases.getData(name), name);
        };
        
        return app.database();
    }

    async setToken(token: string, data: { access_token: string, refresh_token: string, expires_in: number }) {
        await this.api.ref(`Tokens/${token}`).set(data);
    }

    async getToken(token: string) {
        const db = await this.api.ref(`Tokens/${token}`).once("value");
        return db.val();
    }

    async deleteToken(token: string) {
        await this.api.ref(`Tokens/${token}`).remove();
    }

    async addVote(user: string, platform: string) {
        const db = (await this.users.ref(`Users/${user}`).once('value')).val();
        let votes: Array<VoteData> = [];
        if (db && db.votes) votes = db.votes;
        votes.push({
            platform,
            date: Date.now()
        });
        await this.users.ref(`Users/${user}`)[db ? 'update' : 'set']({ votes });
    }
    
    async getGuildDatabase(guildId: string) {
        const db = await this.guilds.ref(`Servers/${guildId}`).once("value");
        return db.val() || {};
    }

    async getLogs() {
        const db = await this.logs.ref().once("value");
        return db.val() || {};
    }

    static getData(key: string) {
        return Object.fromEntries(
            Object.entries(process.env)
                .filter(([k]) => keys.includes(`${k}`.replace(`${key}_`, '')))
                .map(([k, v]) => [k.replace(`${key}_`, ''), v])
        )
    }
}

export default Databases;