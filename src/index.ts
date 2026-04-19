import webdriver from 'selenium-webdriver';
import https from 'https';
import fs from 'fs';
import process from "process";

// 画像をダウンロードする関数
const downloadImage = (url: string, filename: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        // 証明書検証エラー対策
        const options = { rejectUnauthorized: false };
        https.get(url, options, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(filename);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`画像をダウンロードしました: ${filename}`);
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(filename, () => {}); // ファイルを削除
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

const main = async (productId: string) => {
    const capabilities = webdriver.Capabilities.chrome();
    capabilities.set('chromeOptions', {
        args: [
            '--headless',
            '--no-sandbox',
            '--disable-gpu',
            '--window-size=1980,1200'
        ]
    });
    if (fs.existsSync('product_images')){
        fs.rmSync('product_images', { recursive: true, force: true });
    }
    fs.mkdirSync('product_images');

    const driver = await new webdriver.Builder().withCapabilities(capabilities).build();
    
    try {
        await driver.get(`https://jp.mercari.com/item/${productId}`);
        
        // ページが正しく読み込まれているか確認（最大15秒待機）
        await driver.wait(webdriver.until.elementLocated(webdriver.By.id('item-info')), 15000);
        console.log('ページの読み込みが完了しました');
        
        // ページのHTMLをデバッグ用に即座に保存
        const debugPageSource = await driver.getPageSource();
        fs.writeFileSync('page_source.html', debugPageSource, 'utf-8');
        
        // 404や削除済みページでないか確認
        if (debugPageSource.includes('404') || debugPageSource.includes('見つかりません')) {
            throw new Error(`商品が見つかりません。商品ID: ${productId}`);
        }

        const itemInfo = await driver.findElement(webdriver.By.id('item-info'));
    // 商品名を取得（通常はh1タグまたはタイトル要素）
    const productName = await itemInfo.findElement(webdriver.By.css('h1')).getText();
    
    // 商品説明（表示用テキスト）
    const productDescription = await driver.findElement(
        webdriver.By.css('[data-testid="description"]')
    ).getText();
    
    // 商品説明の生HTMLを取得（ハッシュタグが含まれている可能性がある）
    const descriptionElement = await driver.findElement(
        webdriver.By.css('[data-testid="description"]')
    );
    const descriptionHTML = await descriptionElement.getAttribute('innerHTML');
    
    const price = await driver.findElement(
        webdriver.By.css('[data-testid="price"]')
    ).getText();

    // ハッシュタグを抽出
    let hashtags = '';
    try {
        // HTMLから#で始まる単語を抽出
        const hashtagMatches = descriptionHTML.match(/#[^\s<>"]+/g);
        
        if (hashtagMatches) {
            // 重複を削除
            hashtags = [...new Set(hashtagMatches)].join('\n');
            console.log('抽出したハッシュタグ:', hashtags);
        } else {
            console.log('ハッシュタグが見つかりませんでした');
        }
    } catch (error) {
        console.error('ハッシュタグの取得に失敗しました:', error);
    }
    
        // テキストファイルに出力
        const textContent = `商品名: ${productName}\n\n価格: ${price}\n\n商品説明:\n${productDescription}\n\n${hashtags}`;
        fs.writeFileSync(`product_images/${productId}_info.txt`, textContent, 'utf-8');
        console.log('商品情報をテキストファイルに保存しました。');
    } catch (error: any) {
        console.error(`エラーが発生しました:`, error.message);
        // ページのHTML をデバッグ用に保存
        try {
            const errorPageSource = await driver.getPageSource();
            fs.writeFileSync('page_source_error.html', errorPageSource, 'utf-8');
            console.log('エラー時のページHTMLをpage_source_error.htmlに保存しました');
        } catch (e) {
            // ページソース取得失敗時は無視
        }
    } finally {
        await driver.quit();
    }
    
    // 指定された画像をダウンロード
    const numericProductId = productId.replace(/^m/, '');
    for (let i = 1; i <= 20; i++) {
        const imageUrl = `https://static.mercdn.net/item/detail/orig/photos/${productId}_${i}.jpg?${numericProductId}`;
        const fileName = `product_images/downloaded_image_${i}.jpg`;

        try {
            await downloadImage(imageUrl, fileName);
        } catch (error) {
            console.error('画像のダウンロードに失敗しました:', error);
            continue;
        }
    }
};

const productId = process.argv[2];
if (productId) {
    await main(productId);
    process.exit(0);
}
console.error('商品IDを指定してください。例: node src/index.ts <商品ID>');
process.exit(1);

