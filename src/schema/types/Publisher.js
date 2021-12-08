import { gql } from 'apollo-server-express';
import publisherAsync from './../../async/publishers';

export const Publisher = gql`
  type Publisher {
    id: Int!
    congregationid: Int!
    firstname: String
    lastname: String
    username: String
    congregation: Congregation
    status: String
    territories: [Territory]
    role: String
  }
`;

export const PublisherInput = gql`
  input PublisherInput {
    id: Int
    congregationid: Int!
    firstname: String
    lastname: String
    username: String
    status: String
    role: String
    create_user: Int
    update_user: Int
  }
`;

export const queryResolvers = {
  user: async (root, args) => {
    return await publisherAsync.getUser(args.username);
  },

  publisher: async (root, args) => {
    if (args.publisherId) {
      return await publisherAsync.getPublisherById(args.publisherId, args.congId);

    } else if (args.firstname && args.lastname) {
      return await publisherAsync.getPublisherByName(args.firstname, args.lastname, args.congId);
      
    } else if (root && (root.publisher_id || root.publisherid)) {
      return await publisherAsync.getPublisherById(root.publisher_id || root.publisherid);

    }
  },

  creator: async (root) => {
    if (root.create_user) {
      return await publisherAsync.getPublisherById(root.create_user);
    }
  },

  updater: async (root) => {
    if (root.update_user) {
      return await publisherAsync.getPublisherById(root.update_user);
    }
  },

  publishers: async (root, args) => {
    const id = root ? root.id : (args ? args.congId : undefined);
    if (!id) {
      throw new Error('Congregation Id is required to query for publishers');
    }
    
    const result = await publisherAsync.searchPublishers(id, args.keyword);
    return result;
  },
};

export const mutationResolvers = {
  addPublisher: async (root, { publisher }) => {
    const id = await publisherAsync.create(publisher);
    return await publisherAsync.getPublisherById(id);
  },
  updatePublisher: async (root, { publisher }) => {
    await publisherAsync.update(publisher);
    return await publisherAsync.getPublisherById(publisher.id);
  },
  deletePublisher: async( root, { id }) => {
    await publisherAsync.delete(id);
    return true;
  },
};
