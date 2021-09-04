import mongoose from "mongoose";
import {prop,getModelForClass} from '@typegoose/typegoose';

export class Token{
    
    _id!:mongoose.Types.ObjectId;

    @prop({required:true})
    userId!:string;

    @prop({required:true})
    token!:string;

    @prop({default:Date.now,expires:60*5})
    created_at:Date;
}

export const TokenModel = getModelForClass(Token);