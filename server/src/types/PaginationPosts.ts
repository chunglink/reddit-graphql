import { Post } from "../entities/Post";
import { Field, ObjectType } from "type-graphql";

@ObjectType()
export class PaginationPosts{
    @Field()
    totalCount!:number;

    @Field(_tyoe=>Date)
    cursor!:Date

    @Field()
    hasMore!:boolean;

    @Field(_type=>[Post])
    paginatedPosts!:Post[];
}