import { RegisterInput } from "../types/RegisterInput";

export const validateRegisterInput =(registerInput:RegisterInput)=>{
    if(!registerInput.email.includes('@')){
        return {
            message:'invalid email',
            error:[
                {
                    field:'email',
                    message:'Email must include @symbol'
                }
            ]
        };
    }
    if(registerInput.username.length<=2){
        return {
            message:'invalid username',
            error:[
                {
                    field:'username',
                    message:'Length must be greater than 2'
                }
            ]
        };
    }
    if(registerInput.password.length<=2){
        return {
            message:'invalid password',
            error:[
                {
                    field:'password',
                    message:'Length must be greater than 2'
                }
            ]
        }; 
    }

    return null;
}