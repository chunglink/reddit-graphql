import argon2 from "argon2";
import { User } from "../entities/User";
import { Arg, Ctx, Mutation, Resolver,Query, FieldResolver, Root } from "type-graphql";
import { UserMutationResponse } from "../types/UserMutationResponse";
import { RegisterInput } from "../types/RegisterInput";
import { validateRegisterInput } from "../utils/validateRegisterInput";
import { LoginInput } from "../types/LoginInput";
import { Context } from "../Context";
import { COOKIE_NAME } from "../constants";
import { ForgotPasswordInput } from "../types/ForgotPasswordInput";
import { sendEmail } from "../utils/sendEmail";
import { Token, TokenModel } from "../models/Token";
import {v4 as uuidv4} from "uuid";
import { ChangePasswordInput } from "../types/ChangePasswordInput";
@Resolver(_of=>User)
export class UserResolver{
    @FieldResolver(_return =>String)
    email(@Root() user:User, @Ctx() {req}:Context){
        return req.session.userId ===user.id ?user.email:'';
    }
    
    @Query(_return => User, {nullable:true})
    async me(@Ctx() {req}:Context):Promise<User|null|undefined>{
        if(!req.session.userId){
            return null;
        }
        const user = User.findOne(req.session.userId);
        return user;
    }
    @Mutation (_return => UserMutationResponse,{nullable:true})
    async register(
        @Arg('registerInput') registerInput:RegisterInput,
        @Ctx() {req}:Context
    ):Promise<UserMutationResponse>{
        const validate = validateRegisterInput(registerInput);
        console.log("validate",validate);
        if(validate !== null){
            return {
                code:400,
                success:false,
                ...validate
            }
        }
        try {
            const {username,email, password} = registerInput;
            const existingUser = await User.findOne({
                where:[{username},{email}]
            });
            if (existingUser){

                return {
                    code:400,
                    success:false,
                    message:"Duplicated username or email",
                    error:[
                        {
                            field:existingUser.username == username?"username":"email",
                            message:`${existingUser.username == username?'username':'email'} have been taken`
                        }
                    ]
                };
            }
            const hashPassword = await argon2.hash(password);
            const newUser = User.create({
                username,
                password: hashPassword,
                email
            });
            await newUser.save();
            req.session.userId = newUser.id;
            return {
                code:200,
                success:true,
                message:"user registration successful",
                user :newUser
            }; 
        } catch (error) {
            console.error(error);
            return {
                code:500,
                success:false,
                message:`internal server error ${error.message}`,
                
            };
        }
        
    }
    @Mutation(_return =>UserMutationResponse)
    async login(
        @Arg('loginInput') loginInput:LoginInput,
        @Ctx() {req} :Context
    ):Promise<UserMutationResponse>{
        try {
            const {usernameOrEmail,password}= loginInput;
            const existingUser = await User.findOne(
                usernameOrEmail.includes('@')?
                {email:usernameOrEmail}
                :
                {username:usernameOrEmail}
            );
            if(!existingUser){
                return {
                    code:400,
                    success:false,
                    message:"user not found",
                    error:[{
                        field:'usernameOrEmail',
                        message:'username or email incorrect'
                    }]
                }
            }
            const passValid = await argon2.verify(existingUser.password,password);
            if(!passValid){
                return {
                    code:400,
                    success:false,
                    message:"wrong password",
                    error:[{
                        field:'password',
                        message:'password incorrect'
                    }]
                } 
            }
            //create session and return cookie
            req.session.userId = existingUser.id;

            return {
                code:200,
                success:true,
                message:"login successfully",
                user:existingUser
            }
        } catch (error) {
            return {
                code:500,
                success:false,
                message:`internal server error ${error.message}`,
                
            }; 
        }
        
    }
    @Mutation(_return =>Boolean)
    logout(
        @Ctx() {req,res} :Context
    ):Promise<boolean>{
       return new Promise ((resolve,_reject)=>{
            res.clearCookie(COOKIE_NAME);
            req.session.destroy(err=>{
                if(err){
                    resolve(false);
                }
            });
            resolve(true);
       })

    }
    @Mutation(_return=>Boolean)
    async forgotPassword(
        @Arg('forgotPasswordInput') forgotPasswordInput:ForgotPasswordInput
    ):Promise<boolean>{
        const user = await User.findOne({email:forgotPasswordInput.email});
        if(!user){
            return true;
        }
        await TokenModel.findOneAndDelete({userId:`${user.id}`})
        const resetToken = uuidv4();
        const hashToken = await argon2.hash(resetToken);
        
        await new TokenModel({userId:`${user.id}`,token:hashToken}).save();

        await sendEmail(forgotPasswordInput.email,`<a href="http://localhost:3000/change-password?token=${resetToken}&userId=${user.id}">click here to reset your password</a>`);
        return true;
    }
    @Mutation(_return=>UserMutationResponse)
    async changePassword(
        @Arg('token') token:string,
        @Arg('userId') userId:string,
        @Arg('changePasswordInput') changePasswordInput:ChangePasswordInput,
        @Ctx() {req} :Context
    ):Promise<UserMutationResponse>{
        if(changePasswordInput.newPassword.length<=2){
            return {
                code:400,
                success:false,
                message:"invalid password",
                error:[{
                    field:'newPassword',
                    message:'length must be grater than 2'
                }]
            }
        }
        try {
            const resetToken = await TokenModel.findOne({userId});
            if(!resetToken){
                return {
                    code:400,
                    success:false,
                    message:"invalid or expire token",
                    error:[{
                        field:'token',
                        message:'invalid token'
                    }]
                }
            }
            const validateToken = await argon2.verify(resetToken.token,token);
            if(!validateToken){
                return {
                    code:400,
                    success:false,
                    message:"invalid or expire token",
                    error:[{
                        field:'token',
                        message:'invalid token'
                    }]
                }
            }
            const userIdNum = parseInt(userId);
            const user = await User.findOne(userIdNum);
            if(!user){
                return {
                    code:400,
                    success:false,
                    message:"user no longer exists",
                    error:[{
                        field:'token',
                        message:'invalid token'
                    }]
                }
            }
            const updatePass = await argon2.hash(changePasswordInput.newPassword);
            await User.update({id:userIdNum},{password:updatePass});
            resetToken.deleteOne();
            req.session.userId = user.id;
            return {
                code:200,
                success:true,
                message:"change password successfully",
                user:user
            };         
        } catch (error) {
            return {
                code:500,
                success:false,
                message:`internal server error ${error.message}`,
            }
        }
    }
}