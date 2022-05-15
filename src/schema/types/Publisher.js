import { ApolloError, gql } from 'apollo-server-express';
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
    try {
      return await publisherAsync.getUser(args.username);
    } catch (error) {
      throw new ApolloError(
        'Unable to get user',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Publisher/user', arguments: { root, args }},
      );
    }
  },

  publisher: async (root, args) => {
    try {
      if (args.publisherId) {
        return await publisherAsync.getPublisherById(args.publisherId, args.congId);

      } else if (args.firstname && args.lastname) {
        return await publisherAsync.getPublisherByName(args.firstname, args.lastname, args.congId);
        
      } else if (root && (root.publisher_id || root.publisherid)) {
        return await publisherAsync.getPublisherById(root.publisher_id || root.publisherid);
      }
    } catch (error) {
      throw new ApolloError(
        'Unable to get publisher',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Publisher/publisher', arguments: { root, args }},
      );
    }
  },

  creator: async (root) => {
    try {
      if (root.create_user) {
        return await publisherAsync.getPublisherById(root.create_user);
      }
    } catch (error) {
      throw new ApolloError(
        'Unable to get creator',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Publisher/creator', arguments: { root }},
      );
    }
  },

  updater: async (root) => {
    try {
      if (root.update_user) {
        return await publisherAsync.getPublisherById(root.update_user);
      }
    } catch (error) {
      throw new ApolloError(
        'Unable to get updater',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Publisher/updater', arguments: { root }},
      );
    }
  },

  publishers: async (root, args) => {
    try {
      const id = root ? root.id : (args ? args.congId : undefined);
      if (!id) {
        throw new Error('Congregation Id is required to query for publishers');
      }
      
      const result = await publisherAsync.searchPublishers(id, args.keyword);
      return result;
    } catch (error) {
      throw new ApolloError(
        'Unable to get publishers',
        'QUERY_RESOLVER_ERROR',
        { error, path: 'Publisher/publishers', arguments: { root, args }},
      );
    }
  },
};

export const mutationResolvers = {
  addPublisher: async (root, { publisher }) => {
    try {
      const id = await publisherAsync.create(publisher);
      return await publisherAsync.getPublisherById(id);
    } catch (error) {
      throw new ApolloError(
        'Unable to add publisher',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Publisher/addPublisher', arguments: { root, publisher }},
      );
    }
  },
  updatePublisher: async (root, { publisher }) => {
    try {
      await publisherAsync.update(publisher);
      return await publisherAsync.getPublisherById(publisher.id);
    } catch (error) {
      throw new ApolloError(
        'Unable to update publisher',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Publisher/updatePublisher', arguments: { root, publisher }},
      );
    }
  },
  deletePublisher: async( root, { id }) => {
    try {
      await publisherAsync.delete(id);
      return true;
    } catch (error) {
      throw new ApolloError(
        'Unable to delete publisher',
        'MUTATION_RESOLVER_ERROR',
        { error, path: 'Publisher/deletePublisher', arguments: { root, id }},
      );
    }
  },
};
