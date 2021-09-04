require('dotenv').config();
import 'reflect-metadata';
import express from 'express';
import { createConnection } from 'typeorm';
import { User } from './entities/User';
import { Post } from './entities/Post';
import { ApolloServer } from 'apollo-server-express';
import { buildSchema } from 'type-graphql';
import { HelloResolver } from './resolvers/hello';
import { ApolloServerPluginLandingPageGraphQLPlayground } from "apollo-server-core";
import { UserResolver } from './resolvers/user';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import session from 'express-session';
import { COOKIE_NAME, __prod__ } from './constants';
import { Context } from './Context';
import { PostResolver } from './resolvers/post';
import cors from 'cors';
import { Upvote } from './entities/Upvote';
import { buildDataLoaders } from './utils/dataLoaders';
import path from 'path';

const main = async ()=>{

    const connection = await createConnection({
		type: 'postgres',
		...(__prod__
			? { url: process.env.DATABASE_URL }
			: {
					database: 'reddit',
					username: process.env.DB_USERNAME_DEV,
					password: process.env.DB_PASSWORD_DEV
			  }),
		logging: true,
		...(__prod__
			? {
					ssl: {
                        rejectUnauthorized: false
                    }
			  }
			: {}),
		...(__prod__ ? {} : { synchronize: true }),
		entities: [User, Post, Upvote],
		migrations: [path.join(__dirname, '/migrations/*')]
	})
    if(__prod__) await connection.runMigrations();
    const app = express();
    app.use(cors({
        origin: __prod__?process.env.CORS_ORIGIN_PROD:process.env.CORS_ORIGIN_DEV,
        credentials:true
    }))
    // session/cookie store
    const mongURL = `mongodb+srv://${process.env.SESSION_USER}:${process.env.SESSION_PASSWORD}@reddit.qgvtv.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
    await mongoose.connect(
        mongURL
    );
    console.log("mongose connected");
    app.set('trust proxy', 1);
    


    app.use(session({
        name:COOKIE_NAME,
        store:MongoStore.create({mongoUrl:mongURL}),
        cookie:{
            maxAge:1000*60*60,
            httpOnly:true,
            secure:__prod__,
            sameSite:'lax',
            domain:__prod__?'.vercel.app':undefined

        },
        secret:process.env.SESSION_SECRET as string,
        saveUninitialized:false, 
        resave:false
    }));
    

    const apolloServer = new ApolloServer({
		schema: await buildSchema({
			resolvers: [HelloResolver, UserResolver, PostResolver],
			validate: false
		}),
		context: ({ req, res }): Context => ({
			req,
			res,
            connection,
            dataLoaders:buildDataLoaders()
		}),
		plugins: [ApolloServerPluginLandingPageGraphQLPlayground()]
	})
    await apolloServer.start();
    apolloServer.applyMiddleware({app, cors:false});
    const PORT = process.env.PORT || 4000;
    app.listen(PORT,()=>console.log("server started at port 4000"));
}

main().catch(err=> console.error(err))