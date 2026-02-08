#!/usr/bin/env python3
import argparse
import os
from pymongo import MongoClient


def main():
  parser = argparse.ArgumentParser(description='Resolve user id by login from MongoDB.')
  parser.add_argument('--mongo-uri', default=os.getenv('MONGODB_URI', 'mongodb://localhost:27017/'))
  parser.add_argument('--db', default=os.getenv('MONGODB_DB', 'mealplanner'))
  parser.add_argument('--login', required=True)
  args = parser.parse_args()

  client = MongoClient(args.mongo_uri)
  db = client[args.db]
  user = db['users'].find_one({'login': args.login})
  if not user:
    print('not found')
    return 1
  print(user.get('_id'))
  return 0


if __name__ == '__main__':
  raise SystemExit(main())
