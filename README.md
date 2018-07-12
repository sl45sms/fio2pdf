# fio2pdf
Docker Service, Corvert Form to PDF

# build

docker build -t skarvelis/fio2pdf:1.0 .


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
  http://localhost:6112 -o form.pdf 
```

