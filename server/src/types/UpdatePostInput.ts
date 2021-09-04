import { Field, ID, InputType } from "type-graphql";

@InputType()
export class UpdatePostInput{
    @Field(_tupe=>ID)
    id:number;
    
    @Field()
    title:string;

    @Field()
    text:string
}