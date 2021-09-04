import { Context } from "../Context";
import { MiddlewareFn } from "type-graphql";
import { AuthenticationError } from "apollo-server-core";


export const checkAuth: MiddlewareFn<Context> =  ({ context:{req} }, next) => {
    if(!req.session.userId){
        throw new AuthenticationError('not authentification');
    }
    return next();
};