import { Box, Button, Flex, Spinner, useToast } from "@chakra-ui/react";
import { Formik, Form, FormikHelpers } from "formik";
import { useRouter } from "next/router";
import React from "react";
import InputField from "../components/InputField";
import Wrapper from "../components/Wrapper";

import { MeDocument, MeQuery, RegisterInput, useRegisterMutation } from "../generated/graphql";
import { mapFieldErrors } from "../helpers/mapFieldErrors";
import { useCheckAuth } from "../utils/useCheckAuth";
const toast = useToast();
const Register = () => {
    const router= useRouter();
    const {data:authData, loading:authLoading} = useCheckAuth();
    
    const initialValues:RegisterInput ={username:'',password:'',email:''};
    const [registerUser,{loading:_registerUserLoading,data,error}] = useRegisterMutation(); 
    
    const onRegisterSubmit=async (values:RegisterInput,{setErrors}:FormikHelpers<RegisterInput>)=>{
        const response = await registerUser({
            variables:{
                registerInput:values
            },
            update(cache,{data}){
                //const meData = cache.readQuery({query:MeDocument});
                if(data?.register?.success){
                    cache.writeQuery<MeQuery>({
                        query:MeDocument,
                        data:{
                            me:data.register.user
                        }
                    });
                }
            }
        });
        const errors =response.data?.register?.error; 
        if(errors){
            setErrors(mapFieldErrors(errors));
        }else if(response.data?.register?.user){
            router.push("/");
        }
        console.log("response", response);
    }
    return (
        <>
        {authLoading || (!authLoading && authData?.me)?
            <Flex justifyContent='center' alignItems='center'>
                <Spinner />
            </Flex>
            :
            <Wrapper  size='small'>
                {error && <p>failed to register</p>}
                {data && data.register?.success&&
                    toast({
                        title: "Welcome",
                        description: `${data.register.user?.username}`,
                        status: "success",
                        duration: 3000,
                        isClosable: true,
                      })
                
                }
                <Formik
                    onSubmit={
                        onRegisterSubmit
                    } 
                    initialValues={initialValues}
                >
                {
                    ({isSubmitting})=>(
                        <Form>
                            <InputField
                                name='username' 
                                placeholder="User name" 
                                label='User name'
                                type="text"
                            />
                            <Box mt={4}>
                                <InputField
                                    name='email' 
                                    placeholder="Email" 
                                    label="Email"
                                    type="email"
                                />
                            </Box>
                            
                            <Box mt={4}>
                                <InputField
                                    name='password' 
                                    placeholder="Password" 
                                    label="Password"
                                    type="password"
                                />
                            </Box>
                            
                            <Button type="submit" colorScheme="teal" mt={4} isLoading={isSubmitting}>
                                Register
                            </Button>
                        </Form>
                    )
                }
                </Formik>
            </Wrapper>
        }
       </> 
    )
}

export default Register
