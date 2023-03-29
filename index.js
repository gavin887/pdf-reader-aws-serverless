const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const serverless = require("serverless-http");

const Koa = require("koa");
const route = require("koa-route");

const app = new Koa();

const ATTACHMENTS_TABLE = process.env.ATTACHMENTS_TABLE;
const client = new DynamoDBClient();
const dynamoDbClient = DynamoDBDocumentClient.from(client);

/**
 * default route
 */
app.use((req, res, next) => {
  return res.status(404).json({
    error: "Not Found",
  });
});

/**
 * homePage
 */
app.use(route.get('/', ctx => {
  ctx.response.body = 'hello world!'
}));

module.exports.handler = serverless(app);



// app.get("/users/:userId", async function (req, res) {
//   const params = {
//     TableName: USERS_TABLE,
//     Key: {
//       userId: req.params.userId,
//     },
//   };
//
//   try {
//     const { Item } = await dynamoDbClient.send(new GetCommand(params));
//     if (Item) {
//       const { userId, name } = Item;
//       res.json({ userId, name });
//     } else {
//       res
//         .status(404)
//         .json({ error: 'Could not find user with provided "userId"' });
//     }
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Could not retreive user" });
//   }
// });
//
// app.post("/users", async function (req, res) {
//   const { userId, name } = req.body;
//   if (typeof userId !== "string") {
//     res.status(400).json({ error: '"userId" must be a string' });
//   } else if (typeof name !== "string") {
//     res.status(400).json({ error: '"name" must be a string' });
//   }
//
//   const params = {
//     TableName: USERS_TABLE,
//     Item: {
//       userId: userId,
//       name: name,
//     },
//   };
//
//   try {
//     await dynamoDbClient.send(new PutCommand(params));
//     res.json({ userId, name });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "Could not create user" });
//   }
// });
