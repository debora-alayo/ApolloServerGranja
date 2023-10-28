import { ApolloServer } from '@apollo/server';
import { createServer } from 'http';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import bodyParser from 'body-parser';
import express from 'express';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { PubSub } from 'graphql-subscriptions';
//importar cors
import cors from 'cors';


const port = 4000;

const personas = [
    { id: 1, nombre: 'Juan', edad: 30, ciudad: 'Ciudad A' },
    { id: 2, nombre: 'María', edad: 25, ciudad: 'Ciudad B' },
    { id: 3, nombre: 'Pedro', edad: 35, ciudad: 'Ciudad A' },
    { id: 4, nombre: 'Laura', edad: 28, ciudad: 'Ciudad C' },
    // Agrega más objetos de persona según sea necesario
  ]
  
  const plant = []; // Agregue esta línea
  const farms = [{id:1 , userId: 1, currentSize:20, maxSize:40, nextTier: 10}]; // Agregue esta línea
  const constructions = []; // Agregue esta línea
  const users = [{ id: 1, username: "Granjero Triste", email: "fdsfs", password: "fsdf", farmId: 1}]; // Agregue esta línea
  const ads = []; // Agregue esta línea
  
  
  const typeDefs = `
    type Persona {
      id: ID!
      nombre: String!
      edad: Int!
      ciudad: String!
    }

    type Plant {
      id: ID!
      name: String!
      daysToGrow: Int!
      lifeExpectancy: Int!
      minHarvest: Int!
      maxHarvest: Int!
      description: String
    }
  
    type Farm {
        id: ID!
        userId: User!
        currentSize: Int!
        maxSize: Int!
        nextTier: Int!
        constructions: Construction
    }
    
    type Construction {
        id: ID!
        farm: Farm!
        plant: Plant!
        isBuilt: Boolean!
        posX: Int!
        posY: Int!
        daysTillDone: Int!
        isWatered: Boolean!
    }
  
    type User {
        id: ID!
        username: String!
        email: String!
        password: String!
        farmId: ID
    }
    
    type Ad {
        name: String!
        description: String!
    }
  
    type Query {
        personas: [Persona!]!
        plant: [Plant]
        farms(userId: ID): [Farm]
        constructions: [Construction]
        users: [User]
        ads: [Ad]
    }
    
    type Mutation {
        addPlant(name: String!, daysToGrow: Int!, lifeExpectancy: Int!, minHarvest: Int!, maxHarvest: Int!, description: String): Plant
        addFarm(userId: ID!, currentSize: Int!, maxSize: Int!, nextTier: Int!): Farm
        addConstruction(farmId: ID!, plantId: ID!, isBuilt: Boolean!, posX: Int!, posY: Int!, daysTillDone: Int!, isWatered: Boolean!): Construction
        addUser(username: String!, email: String!, password: String!, farmId: ID): User
        addAd(name: String!, description: String!): Ad
        agregarPersona(nombre: String!, edad: Int!, ciudad: String!): Persona!

    }
  
    
    type Subscription {
      nuevaPersona: Persona!
    }
    `

const pubSub = new PubSub();

const mockLongLastingOperation = (nombre, edad, ciudad) => {
    setTimeout(() => {
        pubSub.publish('NUEVA_PERSONA', { nuevaPersona: { nombre, edad, ciudad } });
    }, 1000);
}


const resolvers = {
    Query: {
      personas: () => personas,
      plant: () => plant, // Asumo que también tienes un array "plantas"
      farms: (_, { userId }) => {
        if (userId) {
          console.log(userId);
          // Filtra las granjas por el userId
          console.log(farms);
          console.log(farms.filter((farm) => farm.userId === parseInt(userId)));
          return farms.filter((farm) => farm.userId === parseInt(userId));
        }
        // Si userId no se proporciona, devuelve todas las granjas
        return farms;
      },
      constructions: () => constructions, // Asumo que también tienes un array "construcciones"
      users: () => users, // Asumo que también tienes un array "usuarios"
      ads: () => ads, // Asumo que también tienes un array "anuncios"
      },
    Mutation: {
      agregarPersona: (_, { nombre, edad, ciudad}) => {
        const nuevaPersona = { id: personas.length + 1, nombre, edad, ciudad };
        personas.push(nuevaPersona);

        mockLongLastingOperation(nombre, edad, ciudad);        
        return nuevaPersona;
      },

      addPlant: (_, args) => {
        const nuevaPlanta = {
          id: plant.length + 1,
          ...args,
        };
        plant.push(nuevaPlanta);
        return nuevaPlanta;
      },
      addFarm: (_, args) => {
        const nuevaGranja = {
          id: farms.length + 1,
          ...args,
        };
        farms.push(nuevaGranja);
        return nuevaGranja;
      },
      addConstruction: (_, args) => {
        const nuevaConstruccion = {
          id: constructions.length + 1,
          ...args,
        };
        constructions.push(nuevaConstruccion);
        return nuevaConstruccion;
      },
      addUser: (_, args) => {
        const nuevoUsuario = {
          id: user.length + 1,
          ...args,
        };
        user.push(nuevoUsuario);
        return nuevoUsuario;
      },
      addAd: (_, args) => {
        const nuevoAnuncio = {
          ...args,
        };
        ads.push(nuevoAnuncio);
        return nuevoAnuncio;
      },

    },
    Subscription: {
      nuevaPersona: {
        subscribe: () => pubSub.asyncIterator(['NUEVA_PERSONA']),
      },
    },
  }
  

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
app.use(cors({
  origin: 'http://localhost:3000', // Permite solicitudes desde este origen
}));

const httpServer = createServer(app);

const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql'
});

const wsServerCleanup = useServer({schema}, wsServer);

const apolloServer = new ApolloServer({
    schema,
    plugins: [
       // Proper shutdown for the HTTP server.
       ApolloServerPluginDrainHttpServer({ httpServer }),

       // Proper shutdown for the WebSocket server.
       {
        async serverWillStart() {
            return {
                async drainServer() {
                    await wsServerCleanup.dispose();
                }
            }
        }
       }
    ]
});

await apolloServer.start();

app.use('/graphql', bodyParser.json(), expressMiddleware(apolloServer));

httpServer.listen(port, () => {
    console.log(`🚀 Query endpoint ready at http://localhost:${port}/graphql`);
    console.log(`🚀 Subscription endpoint ready at ws://localhost:${port}/graphql`);
});


