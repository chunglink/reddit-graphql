import { Box, Button, Flex, Link, Spinner } from "@chakra-ui/react"
import { Form, Formik } from "formik"
import InputField from "../components/InputField"
import Wrapper from "../components/Wrapper"
import { ForgotPasswordInput, useForgotPasswordMutation } from "../generated/graphql"
import { useCheckAuth } from "../utils/useCheckAuth";
import NextLink from 'next/link';

const ForgotPassword = () => {
    const initialValues ={email:''};
    const [forgotPassword,{loading,data}] = useForgotPasswordMutation();
    const {data:authData, loading:authLoading} = useCheckAuth();  
    const onForgotPasswordSubmit= async(values:ForgotPasswordInput)=>{
        await forgotPassword({
            variables:{forgotPasswordInput:values}
        });
    }
    if(authLoading || (!authLoading && authData?.me)){
        return(
            <Flex justifyContent='center' alignItems='center'>
                <Spinner />
            </Flex>
        );
    }
    return (
        <Wrapper size='small'>
               
            <Formik
                onSubmit={
                    onForgotPasswordSubmit
                } 
                initialValues={initialValues}
            >
            {
                ({isSubmitting})=>!loading && data?<Box>please check your inbox</Box>:(
                    <Form>
                        <InputField
                            name='email' 
                            placeholder="email" 
                            label="Email"
                            type="email"
                        />
                        <Flex mt={2}>
                            <NextLink href="/login">
                                <Link ml='auto'>Back to Login</Link>
                            </NextLink>
                        </Flex>
                        
                        <Button type="submit" colorScheme="teal" mt={4} isLoading={isSubmitting}>
                           Send reset password email 
                        </Button>
                    </Form>
                )
            }
            </Formik>
        </Wrapper>
    )
}

export default ForgotPassword
