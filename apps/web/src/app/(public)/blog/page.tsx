import { graphql } from "gql.tada";
import { client } from "@/lib/urql";
import BlogList from "@/components/blog-list";

const BlogPostsQuery = graphql(`
  query Posts {
    posts(first: 8) {
      nodes {
        id
        title
        date
        slug
        tags {
          nodes {
            name
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        excerpt
        status
        featuredImage {
          node {
            srcSet
          }
        }
        author {
          node {
            name
            slug
          }
        }
      }
    }
  }
`);

const BlogListPage = async ({ params }: { params: { slug: string[] } }) => {
  const posts = await client.query(BlogPostsQuery, {});
  return (
    <div>
      <BlogList posts={posts.data?.posts?.nodes} />
    </div>
  );
};

export default BlogListPage;
