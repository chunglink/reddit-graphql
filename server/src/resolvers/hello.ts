import { Context } from "src/Context";
import { Ctx, Query, Resolver } from "type-graphql";

@Resolver()
export class HelloResolver{
    @Query(_return=>String)
    hello(@Ctx() {req}:Context){
        console.log(req.session.userId)
        return 'hello world';
    }
}