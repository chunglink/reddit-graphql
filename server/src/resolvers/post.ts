import { UpdatePostInput } from "../types/UpdatePostInput";
import { Arg, Mutation, Resolver, Query, ID, Ctx, UseMiddleware, FieldResolver, Root, Int, registerEnumType } from "type-graphql";
import { Post } from "../entities/Post";
import { CreatePostInput } from "../types/CreatePostInput";
import { PostMutationResponse } from "../types/PostMutationResponse";
import { Context } from "../Context";
import { checkAuth } from "../middleware/checkAuth";
import { User } from "../entities/User";
import { PaginationPosts } from "../types/PaginationPosts";
import { LessThan } from "typeorm";
import { VoteType } from '../types/VoteType'
import { UserInputError } from "apollo-server-core";
import { Upvote } from "../entities/Upvote";
registerEnumType(VoteType, {
	name: 'VoteType' // this one is mandatory
})

@Resolver(_of=>Post)
export class PostResolver{
    @FieldResolver(_return =>String)
    textSnippet(@Root() root:Post){
        return root.text.slice(0,50);
    }
    @FieldResolver(_return =>User)
    async user(@Root() root:Post){
        return await User.findOne(root.userId);
    }
    @FieldResolver(_return => Int)
	async voteType(
		@Root() root: Post,
		@Ctx() { req, dataLoaders: { voteTypeLoader } }: Context
	) {
		if (!req.session.userId) return 0
		// const existingVote = await Upvote.findOne({
		// 	postId: root.id,
		// 	userId: req.session.userId
		// })

		const existingVote = await voteTypeLoader.load({
			postId: root.id,
			userId: req.session.userId
		})

		return existingVote ? existingVote.value : 0
	}

    
    @Mutation(_return=>PostMutationResponse)
    async createPost(
        @Arg('createPostInput') {title, text}:CreatePostInput,
        @Ctx() {req}:Context
    ):Promise<PostMutationResponse>{
        try {
            const newPost = Post.create({title, text});
            await newPost.save();
            return {
                code:200,
                success:true,
                message:'create post successfully',
                post:newPost
            }
        } catch (error) {
            return {
                code:400,
                success:false,
                message:`internal server err ${error.message}`,
                
            } 
        }
        
    }
    @Query(_return=>PaginationPosts,{nullable:true})
    async posts(
        @Arg('limit', _type=>Int) limit:number,
        @Arg('cursor',{nullable:true}) cursor?:string

    ):Promise<PaginationPosts|null>{
        try {
            const totalPostCount = await Post.count();

            const realLimit = Math.min(10,limit);
            const findOptions:{[key:string]:any}={
                order:{
                    created_at:'DESC'
                },
                take:realLimit,
            }
            let lastPost:Post[]=[];
            if(cursor){
                findOptions.where = {created_at:LessThan(cursor)};
                lastPost = await Post.find({order:{created_at:'ASC'},take:1})
            }
            const posts = await Post.find(findOptions);
            return {
                totalCount:totalPostCount,   
                cursor: posts[posts.length-1].created_at,
                hasMore:cursor?posts[posts.length-1].created_at.toString() !==lastPost[0].created_at.toString():posts.length!==totalPostCount,
                paginatedPosts:posts
            }
        } catch (error) {
            return null;
        }
        
    }

    @Query(_return =>Post, {nullable:true})
    async post(@Arg('id', _type=>ID) id:number):Promise<Post|undefined>{
        try {
            const post = await Post.findOne(id);
            return post;
        } catch (error) {
            return undefined 
        }
       
       
    }
    @Mutation(_return=>PostMutationResponse)
    @UseMiddleware(checkAuth) 
    async updatePost(
        @Arg('updatePostInput') {id,title,text}:UpdatePostInput,
        @Ctx() {req}:Context
    ):Promise<PostMutationResponse>{

        try {
            
            const post = await Post.findOne(id); 
            if(!post){
                return {
                    code:400,
                    success:false,
                    message:`Post not found`,
                    
                }  
            }
            if(post.userId!==req.session.userId){
                return {
                    code:401,
                    success:false,
                    message:'unauthorized',
                } 
            }
            post.title = title;
            post.text= text;
            await post.save();
            return {
                code:200,
                success:true,
                message:'successfully',
                post:post
            }
        } catch (error) {
            return {
                code:500,
                success:false,
                message:`internal server err ${error.message}`,
                
            }  
        } 
    }

    
    @Mutation(_return => PostMutationResponse)
    @UseMiddleware(checkAuth)
    async deletePost(
        @Arg('id',_type=>ID) id:number,
        @Ctx() {req}:Context
    ):Promise<PostMutationResponse>{
        try {
            const post = await Post.findOne(id); 
            if(!post){
                return {
                    code:400,
                    success:false,
                    message:`Post not found`,
                    
                }  
            }
            if(post.userId!==req.session.userId){
                return {
                    code:401,
                    success:false,
                    message:'unauthorized',
                } 
            }
            await Post.delete({id});
            return {
                code:200,
                success:true,
                message:'successfully',
                post:post
            }
        } catch (error) {
            return {
                code:500,
                success:false,
                message:`internal server err ${error.message}`,
                
            }  
        } 
    }
    @Mutation(_return => PostMutationResponse)
    @UseMiddleware(checkAuth)
    async vote(
        @Arg('postId',_type=>Int) postId : number,
        @Arg('inputVoteValue',_type => VoteType) inputVoteValue:VoteType,
        @Ctx() {req,connection} : Context
    ):Promise<PostMutationResponse>{

        return await connection.transaction(async transactionEntityManager=>{
            let post = await transactionEntityManager.findOne(Post,postId);
            if(!post){
                throw new UserInputError('Post not found');

            }
            const existingVote = await transactionEntityManager.findOne(Upvote, {
				postId,
				userId:req.session.userId
			})

			if (existingVote && existingVote.value !== inputVoteValue) {
				await transactionEntityManager.save(Upvote, {
					...existingVote,
					value: inputVoteValue
				})

				post = await transactionEntityManager.save(Post, {
					...post,
					points: post.points + 2 * inputVoteValue
				})
			}

			if (!existingVote) {
                const newVote = await transactionEntityManager.create(Upvote,
                    {
                        userId:req.session.userId,
                        postId,
                        value:inputVoteValue
                    }
                );
                await transactionEntityManager.save(newVote);
                post.points = post.points+inputVoteValue;
                post = await transactionEntityManager.save(post);
            }
            return {
                code:200,
                success:true,
                message:'voted successfully',
            }
        })
    }
}