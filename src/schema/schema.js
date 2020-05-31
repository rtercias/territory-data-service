import { makeExecutableSchema } from 'graphql-tools';
import { merge } from 'lodash';
import {
  Address,
  AddressInput,
  queries as addressQueries,
  mutations as addressMutations,
  queryResolvers as addressQueryResolvers,
  mutationResolvers as addressMutationResolvers,
} from './types/Address';
import { Congregation, queries as congregationQueries, resolvers as congregationResolvers } from './types/Congregation';
import { 
  Territory, 
  queries as territoryQueries, 
  mutations as territoryMutations, 
  queryResolvers as territoryQueryResolvers, 
  mutationResolvers as territoryMutationResolvers 
} from './types/Territory';
import { Publisher, queries as publisherQueries, queryResolvers as publisherQueryResolvers } from './types/Publisher';
import { Status } from './types/Status';
import {
  ActivityLog, 
  ActivityLogInput,
  queries as activityLogQueries,
  mutations as activityLogMutations,
  resolvers as activityLogResolvers,
  mutationResolvers as activityLogMutationResolvers,
} from './types/ActivityLog';
import {
  AssignmentRecord,
  queries as assignmentRecordQueries,
  resolvers as assignmentRecordResolvers,
} from './types/AssignmentRecord';

const RootQuery = `
  type RootQuery {
    ${publisherQueries}
    ${congregationQueries}
    ${territoryQueries}
    ${addressQueries}
    ${activityLogQueries}
    ${assignmentRecordQueries}
  }
`;

const Mutation = `
  type Mutation {
    ${territoryMutations}
    ${activityLogMutations}
    ${addressMutations}
  }
`;

const SchemaDefinition = `
  schema {
    query: RootQuery
    mutation: Mutation
  }
`;

const resolvers = {
  RootQuery: merge (
    {}, 
    publisherQueryResolvers,
    congregationResolvers,
    territoryQueryResolvers,
    addressQueryResolvers,
    activityLogResolvers,
    assignmentRecordResolvers,
  ),

  Mutation: merge (
    {},
    territoryMutationResolvers,
    activityLogMutationResolvers,
    addressMutationResolvers,
  ),

  Publisher: {
    congregation: congregationResolvers.congregation,
    territories: territoryQueryResolvers.territories,
  },

  Congregation: {
    territories: territoryQueryResolvers.territories,
    publishers: publisherQueryResolvers.publishers
  },

  Territory: {
    addresses: addressQueryResolvers.addresses,
    status: territoryQueryResolvers.status,
    city: territoryQueryResolvers.city,
  },

  Address: {
    congregation: congregationResolvers.congregation,
    territory: territoryQueryResolvers.territory,
    activityLogs: activityLogResolvers.activityLogs,
    create_user: publisherQueryResolvers.user,
    update_user: publisherQueryResolvers.user,
  },

  Status: {
    publisher: publisherQueryResolvers.publisher,
    territory: territoryQueryResolvers.territory,
  }
}

export default makeExecutableSchema({
  typeDefs: [
    SchemaDefinition,
    RootQuery,
    Mutation,
    Congregation,
    Territory,
    Publisher,
    Address,
    AddressInput,
    Status,
    ActivityLog,
    ActivityLogInput,
    AssignmentRecord,
  ],
  resolvers,
});
