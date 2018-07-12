# fio2pdf
Docker Service, Convert Form Submission to PDF

# build

docker build -t skarvelis/fio2pdf:1.0 .

# run
You can use enviroment variables 

`docker run -e FORMIO_ADMIN_EMAIL="admin@example.com" -e FORMIO_ADMIN_PASSWORD="something" -p6112:6112 -d skarvelis/fio2pdf:1.0`

or a config file

`docker run -v ${PWD}/config.json:/config.json -p6112:6112 -d skarvelis/fio2pdf:1.0`

* look at `config.json.template` for available variables.

# usage 

You have to post the form and submition id,for  example:

```json
{
"submission":{
        "_id":"5b44c168347456002cd7b425",
        "form":"5b37565f076e80002c4969f6"
    }
} 
```

```bash
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{"submission":{"_id":"5b44c168347456002cd7b425",form":"5b37565f076e80002c4969f6"}}' \
  http://localhost:6112/ -o form.pdf 
```
* _note the / at the end!_


