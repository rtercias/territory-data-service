import { gql } from 'apollo-server-express';
const { logger } = require('firebase-functions');
import { merge } from 'lodash';
import { generateUserToken } from '../utils/Firebase';
import {
  Address,
  AddressInput,
  queryResolvers as addressQueryResolvers,
  mutationResolvers as addressMutationResolvers,
} from './types/Address';
import {
  Congregation,
  CongregationInput,
  queryResolvers as congregationQueryResolvers,
  mutationResolvers as congregationMutationResolvers,
} from './types/Congregation';
import {
  Group,
  GroupInput,
  queryResolvers as groupQueryResolvers,
  mutationResolvers as groupMutationResolvers,
} from './types/Group';
import {
  Territory,
  TerritoryInput,
  queryResolvers as territoryQueryResolvers,
  mutationResolvers as territoryMutationResolvers,
} from './types/Territory';
import {
  Publisher,
  PublisherInput,
  queryResolvers as publisherQueryResolvers,
  mutationResolvers as publisherMutationResolvers,
} from './types/Publisher';
import { Status } from './types/Status';
import {
  ActivityLog,
  ActivityLogInput,
  resolvers as activityLogResolvers,
  mutationResolvers as activityLogMutationResolvers,
} from './types/ActivityLog';
import {
  AssignmentRecord,
  resolvers as assignmentRecordResolvers,
} from './types/AssignmentRecord';
import {
  AddressChangeLog,
  resolvers as changeLogResolvers,
} from './types/AddressChangeLog';
import {
  Phone,
  PhoneInput,
  queryResolvers as phoneQueryResolvers,
  mutationResolvers as phoneMutationResolvers,
} from './types/Phone';
import {
  Campaign,
  queryResolvers as campaignQueryResolvers,
  mutationResolvers as campaignMutationResolvers,
} from './types/Campaign';
import { sendSMSMessage } from '../utils/Twilio';

const RootQuery = gql`
  type RootQuery {
    user(username: String): Publisher
    publisher(firstname: String, lastname: String, publisherId: Int, congId: Int): Publisher
    publishers(congId: Int, keyword: String): [Publisher]
    creator: Publisher
    updater: Publisher
    congregation(id: Int!): Congregation
    congregations(keyword: String): [Congregation]
    campaign: Campaign
    historicalCampaigns: [Campaign]
    territory(id: Int): Territory
    territories(congId: Int, keyword: String, group_id: Int, limit: Int, offset: Int, withStatus: Boolean): [Territory]
    status(territoryId: Int): Status
    address(id: Int, status: String): Address
    addresses(congId: Int, terrId: Int, keyword: String, status: String): [Address]
    inactiveAddresses(congId: Int, terrId: Int, keyword: String): [Address]
    dnc(congId: Int, keyword: String): [Address]
    activityLog(id: Int): ActivityLog
    activityLogs(checkout_id: Int, address_id: Int): [ActivityLog]
    getAssignmentRecords(congId: Int, campaignMode: Boolean): [AssignmentRecord]
    optimize(territoryId: Int!, start: Float, end: Float): [Address],
    lastActivity(territoryId: Int, addressId: Int, checkoutId: Int): ActivityLog,
    lastActivities(checkout_id: Int!): [ActivityLog],
    nearestAddresses(congId: Int, coordinates: [Float], radius: Int, unit: String, skip: Int, take: Int): [Address],
    group(id: Int): Group,
    groups(congId: Int): [Group],
    addressChangeLogs(congId: Int, recordId: Int, minDate: String, publisherId: Int): [AddressChangeLog],
    phone(id: Int, status: String): Phone,
    phones(congId: Int, parentId: Int, terrId: Int, keyword: String): [Phone],
    addressCountByTerritories(congId: Int): [Territory],
    phoneCountByTerritories(congId: Int): [Territory],
    token(username: String): String,
  }
`;

const Mutation = gql`
  type Mutation {
    checkoutTerritory(territoryId: Int!, publisherId: Int!, user: String): Int
    checkinTerritory(territoryId: Int!, publisherId: Int!, user: String, checkoutId: Int!): Int
    checkinAll(congId: Int!, username: String!, tz_offset: String!, timezone: String!, campaign: Boolean): Boolean
    copyCheckouts(congId: Int!, username: String!, campaign: Boolean): Boolean
    reassignCheckout(checkoutId: Int!, publisherId: Int!, user: String!): Boolean
    unassignCheckout(checkoutId: Int!, territoryId: Int!): Territory
    addAddress(address: AddressInput!): Address
    updateAddress(address: AddressInput!): Address
    deleteAddress(id: Int!): Boolean
    updateSort(addressIds: [Int]!, userid: Int): Boolean
    changeAddressStatus(addressId: Int!, status: String!, userid: Int!, note: String): Boolean
    addNote(addressId: Int!, userid: Int!, note: String!): Boolean
    removeNote(addressId: Int!, userid: Int!, note: String!): Boolean
    addLog(activityLog: ActivityLogInput): ActivityLog
    updateLog(activityLog: ActivityLogInput): ActivityLog
    removeLog(id: Int!): Boolean
    addPhone(phone: PhoneInput!): Phone
    updatePhone(phone: PhoneInput!): Phone
    updatePhoneSort(phoneIds: [Int]!, userid: Int): Boolean
    changePhoneStatus(phoneId: Int!, status: String!, userid: Int!, note: String): Boolean
    addPhoneTag(phoneId: Int!, userid: Int!, note: String!): Boolean
    removePhoneTag(phoneId: Int!, userid: Int!, note: String!): Boolean
    resetTerritoryActivity(checkout_id: Int!, userid: Int!, tz_offset: String, timezone: String): Boolean
    addCongregation(cong: CongregationInput!): Congregation
    updateCongregation(cong: CongregationInput!): Congregation
    deleteCongregation(id: Int!): Boolean
    addTerritory(territory: TerritoryInput!): Territory
    updateTerritory(territory: TerritoryInput!): Territory
    deleteTerritory(id: Int!): Boolean
    addGroup(group: GroupInput!): Group
    updateGroup(group: GroupInput!): Group
    deleteGroup(id: Int!): Boolean
    addPublisher(publisher: PublisherInput!): Publisher
    updatePublisher(publisher: PublisherInput!): Publisher
    deletePublisher(id: Int!): Boolean
    sendSMS(text: String!, number: String!): String
    startCampaign(name: String!, congId: Int!, publisherId: Int): Campaign
    endCampaign(campaignId: Int!): Boolean
    updateCampaign(campaignId: Int!,name: String!,startDate: String!, endDate: String!): Boolean
  }
`;

const SchemaDefinition = gql`
  schema {
    query: RootQuery
    mutation: Mutation
  }
`;

export const resolvers = {
  RootQuery: merge(
    {
      token: async (root, { username }) => {
        if (!username) throw new Error('username is required');
        return await generateUserToken(username);
      },
    },
    publisherQueryResolvers,
    congregationQueryResolvers,
    territoryQueryResolvers,
    addressQueryResolvers,
    activityLogResolvers,
    assignmentRecordResolvers,
    changeLogResolvers,
    phoneQueryResolvers,
    groupQueryResolvers,
    campaignQueryResolvers,
  ),

  Mutation: merge(
    {
      sendSMS: async (root, { text, number }) => {
        return await sendSMSMessage(text, number);
      },
    },
    publisherMutationResolvers,
    territoryMutationResolvers,
    activityLogMutationResolvers,
    addressMutationResolvers,
    phoneMutationResolvers,
    congregationMutationResolvers,
    groupMutationResolvers,
    campaignMutationResolvers,
  ),

  Publisher: {
    congregation: congregationQueryResolvers.congregation,
    territories: territoryQueryResolvers.territories,
  },

  Congregation: {
    territories: territoryQueryResolvers.territories,
    publishers: publisherQueryResolvers.publishers,
    groups: groupQueryResolvers.groups,
    currentCampaign: campaignQueryResolvers.campaign,
    historicalCampaigns: campaignQueryResolvers.historicalCampaigns,
  },

  Territory: {
    addresses: addressQueryResolvers.addresses,
    inactiveAddresses: addressQueryResolvers.inactiveAddresses,
    status: territoryQueryResolvers.status,
    lastActivity: territoryQueryResolvers.lastActivity,
    lastActivities: territoryQueryResolvers.lastActivities,
    phones: phoneQueryResolvers.phones,
    group: groupQueryResolvers.group,
    activityLogs: activityLogResolvers.activityLogs,
  },

  Address: {
    congregation: congregationQueryResolvers.congregation,
    territory: territoryQueryResolvers.territory,
    activityLogs: activityLogResolvers.activityLogs,
    creator: publisherQueryResolvers.creator,
    updater: publisherQueryResolvers.updater,
    lastActivity: activityLogResolvers.lastActivity,
    phones: phoneQueryResolvers.phones,
  },

  Status: {
    publisher: publisherQueryResolvers.publisher,
    territory: territoryQueryResolvers.territory,
  },

  AddressChangeLog: {
    publisher: publisherQueryResolvers.publisher,
    address: addressQueryResolvers.address,
  },

  Phone: {
    territory: territoryQueryResolvers.territory,
    address: addressQueryResolvers.address,
    activityLogs: activityLogResolvers.activityLogs,
    creator: publisherQueryResolvers.creator,
    updater: publisherQueryResolvers.updater,
    lastActivity: activityLogResolvers.lastActivity,
  },
}

export const typeDefs = [
  SchemaDefinition,
  RootQuery,
  Mutation,
  Congregation,
  CongregationInput,
  Territory,
  TerritoryInput,
  Publisher,
  PublisherInput,
  Address,
  AddressInput,
  Status,
  ActivityLog,
  ActivityLogInput,
  AssignmentRecord,
  AddressChangeLog,
  Phone,
  PhoneInput,
  Group,
  GroupInput,
  Campaign,
];

export const formatError = (err) => {
  delete err.extensions.exception;
  err.extensions.timestamp = (new Date()).toUTCString();
  err.extensions.arguments = JSON.stringify(err.extensions.arguments);
  logger.error(err);
  return err;
};
