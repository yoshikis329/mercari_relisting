# mercari_relisting
メルカリで再出品する

# 環境設定
```
yarn install
```

# 実行方法
```
node src/index.ts <メルカリの商品ID>
```

実行すると、product_imagesフォルダが作成され、その配下に指定した商品IDの商品の写真と「商品名」「価格」「商品説明」が書かれたテキストファイルが生成される。