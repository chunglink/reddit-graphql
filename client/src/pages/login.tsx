import { Box, Button, Flex, Link, Spinner, useToast } from "@chakra-ui/react";
import { Formik, Form, FormikHelpers } from "formik";
import { useRouter } from "next/router";
import InputField from "../components/InputField";
import Wrapper from "../components/Wrapper";
import NextLink from 'next/link'
import { LoginInput, MeDocument, MeQuery, useLoginMutation, } from "../generated/graphql";
import { mapFieldErrors } from "../helpers/mapFieldErrors";
import { useCheckAuth } from "../utils/useCheckAuth";

const Login = () => {
    const toast = useToast();
    const router= useRouter();
    const {data:authData, loading:authLoading} = useCheckAuth();
    const initialValues:LoginInput ={usernameOrEmail:'',password:''};
    const [loginUser,{loading:_loginUserLoading,error}] = useLoginMutation(); 
    
    const onLoginSubmit=async (values:LoginInput,{setErrors}:FormikHelpers<LoginInput>)=>{
        const response = await loginUser({
            variables:{
                loginInput:values
            },
            update(cache,{data}){
                //const meData = cache.readQuery({query:MeDocument});
                if(data?.login.success){
                    cache.writeQuery<MeQuery>({
                        query:MeDocument,
                        data:{
                            me:data.login.user
                        }
                    });
                }
            }
        });
        const errors =response.data?.login?.error; 
        if(errors){
            setErrors(mapFieldErrors(errors));
        }else if(response.data?.login?.user){
            toast({
                title: "Welcome",
                description: `${response.data.login.user?.username}`,
                status: "success",
                duration: 3000,
                isClosable: true,
              })
        
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
            <Wrapper size='small'>
                {error && <p>failed to login</p>}
               
                <Formik
                    onSubmit={
                        onLoginSubmit
                    } 
                    initialValues={initialValues}
                >
                {
                    ({isSubmitting})=>(
                        <Form>
                            <InputField
                                name='usernameOrEmail' 
                                placeholder="Username or email" 
                                label="Account name"
                                type="text"
                            />
                            
                            <Box mt={4}>
                                <InputField
                                    name='password' 
                                    placeholder="Password" 
                                    label="Password"
                                    type="password"
                                />
                            </Box>
                            <Flex mt={2}>
                                <NextLink href="/forgot-password">
                                    <Link ml='auto'>Forgot password</Link>
                                </NextLink>
                            </Flex>
                            
                            <Button type="submit" colorScheme="teal" mt={4} isLoading={isSubmitting}>
                                Login
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

export default Login
