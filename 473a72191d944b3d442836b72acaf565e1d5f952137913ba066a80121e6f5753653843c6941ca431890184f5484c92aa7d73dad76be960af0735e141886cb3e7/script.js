document.addEventListener('DOMContentLoaded', () => {
    // --- データ結合 ---
    let pdfData = [];
    if (typeof pdfData15 !== 'undefined') pdfData = pdfData.concat(pdfData15);
    if (typeof pdfData16 !== 'undefined') pdfData = pdfData.concat(pdfData16);
    if (typeof pdfData17 !== 'undefined') pdfData = pdfData.concat(pdfData17);
    if (typeof pdfData18 !== 'undefined') pdfData = pdfData.concat(pdfData18);
    if (typeof pdfData19 !== 'undefined') pdfData = pdfData.concat(pdfData19);
    if (typeof pdfData20 !== 'undefined') pdfData = pdfData.concat(pdfData20);
    if (typeof pdfData21 !== 'undefined') pdfData = pdfData.concat(pdfData21);
    if (typeof pdfData22 !== 'undefined') pdfData = pdfData.concat(pdfData22);

    //新規回生を追加する場合は
    //if (typeof pdfDataXX !== 'undefined') pdfData = pdfData.concat(pdfDataXX);
    //の形で追加していってください。
    

    // --- Fuse.jsの初期化 ---　細かいことはFuse.jsの公式サイトとかを見てください
    const fuseOptions = {
        keys: ['title', 'author', 'keyword', 'genre'],  // 検索対象のキー
        includeScore: true,                             //検索結果にスコアを含める
        threshold: 0.5,                                 // あいまい検索の度合い(0.0に近いほど厳密)
        minMatchCharLength: 1,                          // 1文字以上から検索
    };
    const fuse = new Fuse(pdfData, fuseOptions); // pdfDataと上記設定でFuseのインスタンスを生成

    // --- DOM要素の取得 ---　HTMLの要素をJSで触れるようにするためにjsの変数にする
    const pdfContainer = document.getElementById('pdf-list');
    const searchBar = document.getElementById('search-bar');
    const generationFilters = document.querySelectorAll('.generation-filter');
    const genreFilters = document.querySelectorAll('.genre-filter');
    const countDisplay = document.getElementById('count-display');
    const backToTopBtn = document.getElementById('back-to-top');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const favoritesOnlyToggle = document.getElementById('favorites-only-toggle');
    const sortBy = document.getElementById('sort-by');
    const filterSection = document.getElementById('filter-section');
    const previewModal = document.getElementById('preview-modal');
    const closeModal = document.getElementById('close-modal');
    const pdfPreviewFrame = document.getElementById('pdf-preview-frame');
    const contextMenu = document.getElementById('context-menu');
    let contextTargetPdf = null; // 右クリック対象のPDFデータを一時的に保持する変数

    // --- 状態管理 ---　ローカルストレージ
    //お気に入り・ダークモードの有効無効・並び順などを保存するためのもの
    const FAVORITES_KEY = 'shounPosterFavorites'; //ブラウザ毎に保存される
    let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; //ローカルストレージからお気に入りを読み込む

    // --- 初期化処理 ---
    //ページ読み込み時に実行する関数
    loadSettings();         //保存された設定を呼び出す(お気に入りとか)
    updatePDFList();        //PDFをリストを初期化する
    setupEventListeners();  //イベントリスナーの設定

    // --- 関数定義 ---
    //SPFで使う関数を設定していきまーす！

    /**
     * PDFリストのフィルタリング、ソート、描画をすべて行うメイン関数
     */
    function updatePDFList() {
        // 1. 検索 (Fuse.js)
        const searchInput = searchBar.value;
        let searchedPdfs;
        if (searchInput.trim() === '') {    // 検索語がなければ全件表示
            searchedPdfs = [...pdfData];
        } else {                            //検索語があればFuse.jsで検索
            const searchResults = fuse.search(searchInput);
            searchedPdfs = searchResults.map(result => result.item);
        }

        // 2. ソート
        const sortValue = sortBy.value;
        // ドロップダウンで選択された値に基づき、検索結果を並べ替える
        searchedPdfs.sort((a, b) => {
            switch (sortValue) {
                case 'generation-desc': return b.generation - a.generation;
                case 'generation-asc': return a.generation - b.generation;
                case 'title-asc': return a.title.localeCompare(b.title, 'ja');  //日本語では漢字の並び順が滅茶苦茶ではあるがご愛嬌
                case 'title-desc': return b.title.localeCompare(a.title, 'ja'); //上同じく
                default: return 0;
            }
        });

        // 3. フィルタリング
        // チェックボックスで選択された世代とジャンルの値を取得する
        const selectedGenerations = Array.from(generationFilters).filter(cb => cb.checked).map(cb => parseInt(cb.value, 10)); // valueを数値に変換
        const selectedGenres = Array.from(genreFilters).filter(cb => cb.checked).map(cb => cb.value);
        const favoritesOnly = favoritesOnlyToggle.checked;  //「お気に入り」がチェックされているか

        // ソート済みのPDFリストから、各フィルター条件に合致するものだけを絞り込む
        const filteredPdfs = searchedPdfs.filter(pdf => {
            if (favoritesOnly && !favorites.includes(pdf.filename)) return false;                               // お気に入りフィルターが有効な場合、お気に入りでなければ除外
            if (selectedGenerations.length > 0 && !selectedGenerations.includes(pdf.generation)) return false;  // 世代フィルターが有効な場合、選択された世代でなければ除外　or検索だね

            const pdfGenres = pdf.genre.split(',').map(g => g.trim());                                          // PDFのジャンルを配列に変換（例: "A, B" -> ["A", "B"]）
            if (selectedGenres.length > 0 && !selectedGenres.every(g => pdfGenres.includes(g))) return false;   // ジャンルフィルターが有効な場合、選択されたジャンルのすべてに一致しなければ除外　and検索だね

            return true;    //上記フィルタリングを突破した場合は残す
        });

        // 4. 描画
        renderPdfs(filteredPdfs);   //最終的に絞り込まれた(Fuse.jsと絞込検索を突破した)PDFのリストを表示

        // 5. 件数表示更新
        countDisplay.textContent = `該当件数: ${filteredPdfs.length} / 全${pdfData.length}件`;  //解説不要かと
        adjustPDFListMargin();
    }

    /**
     * PDFデータを元にHTML要素を生成して表示する
     * @param {Array} pdfs - 表示するPDFデータの配列
     */
    function renderPdfs(pdfs) {
        pdfContainer.innerHTML = '';    //一旦リストを空にする
        // 配列の各PDFデータについて、HTML要素（pdf-box）を生成する
        pdfs.forEach(pdf => {
            const isFavorited = favorites.includes(pdf.filename);   //お気に入り登録されているか
            const pdfBox = document.createElement('div');
            pdfBox.classList.add('pdf-box');
            pdfBox.dataset.filename = pdf.filename; //後で参照するためにファイル名をdata属性に保存

            // ジャンルデータを元にタグのHTML文字列を生成
            const genreTags = pdf.genre.split(',').map(genre =>
                `<span class="tag" data-genre="${genre.trim()}">${genre.trim()}</span>`
            ).join(' ');

            const pdfYear = pdf.generation + 2003
            // pdf-boxの中に表示するHTMLコンテンツを定義
            pdfBox.innerHTML = `
                <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" title="お気に入り">
                    <img src="${isFavorited ? 'heart-solid.svg' : 'heart-regular.svg'}" alt="お気に入りアイコン">
                </button>
                <div class="pdf-genres">${genreTags}</div>
                <div class="pdf-title">${pdf.title}</div>
                <div class="pdf-author">${pdf.author} ${"(" + pdf.generation + "回生 " + pdfYear + "年度)"}</div>
                <div class="pdf-keywords">キーワード: ${pdf.keyword}</div>
            `;


            // イベントリスナー設定

            // pdf-box本体がクリックされたらプレビューを表示（タグやボタンを除く）
            pdfBox.addEventListener('click', (e) => {
                if (!e.target.classList.contains('tag') && !e.target.classList.contains('favorite-btn')) {
                    showPreview(pdf.filename);
                }
            });

            // pdf-boxが右クリックされたらサブメニューを表示
            pdfBox.addEventListener('contextmenu', (e) => { e.preventDefault(); showContextMenu(e, pdf); });

            // 各ジャンルタグがクリックされた時の処理
            pdfBox.querySelectorAll('.tag').forEach(tag => {
                tag.addEventListener('click', (e) => {
                    e.stopPropagation();    // 親要素へのクリックイベントの伝播を停止
                    // 対応するジャンルのフィルターチェックボックスにチェックを入れる
                    const checkbox = document.querySelector(`.genre-filter[value="${tag.dataset.genre}"]`);
                    if (checkbox) { checkbox.checked = !checkbox.checked; }
                    updatePDFList();    // リストを更新
                });
            });

            // お気に入りボタンがクリックされた時の処理
            pdfBox.querySelector('.favorite-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(pdf.filename); });

            // 完成したpdf-boxをコンテナに追加
            pdfContainer.appendChild(pdfBox);
        });
    }

    /**
     * すべてのイベントリスナーをセットアップする
     */
    function setupEventListeners() {
        // 検索、ソート、フィルターの各フォーム要素が変更されたらリストを更新
        searchBar.addEventListener('input', updatePDFList);
        sortBy.addEventListener('change', updatePDFList);
        favoritesOnlyToggle.addEventListener('change', updatePDFList);
        generationFilters.forEach(f => f.addEventListener('change', updatePDFList));
        genreFilters.forEach(f => f.addEventListener('change', updatePDFList));

        // ダークモードトグルが変更されたらテーマを切り替え
        darkModeToggle.addEventListener('change', toggleDarkMode);

        // --- スクロール時の挙動を設定 ---
        let lastScrollY = window.scrollY;   // 直前のスクロール位置を保持
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) { backToTopBtn.classList.remove('hidden'); }  // 300px以上スクロールしたら「トップへ戻る」ボタンを表示
            else { backToTopBtn.classList.add('hidden'); }

            // 下にスクロールしたらフィルターセクションを隠し、上にスクロールしたら表示
            if (lastScrollY < window.scrollY) { filterSection.style.transform = `translateY(-${filterSection.offsetHeight}px)`; }
            else { filterSection.style.transform = 'translateY(0)'; }
            lastScrollY = window.scrollY;
        });

        // 「トップへ戻る」ボタンをクリックしたら、スムーズにページ上部へ移動
        backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

        // プレビューの閉じるボタンや背景をクリックしたらプレビューを閉じる
        closeModal.addEventListener('click', hidePreview);
        previewModal.addEventListener('click', (e) => { if (e.target === previewModal) hidePreview(); });

        // ドキュメントのどこかをクリックしたらコンテキストメニューを閉じる
        document.addEventListener('click', hideContextMenu);
    }


    /**
     * フィルターセクションの高さに応じて、PDFリストの上部マージンを調整する
     */
    function adjustPDFListMargin() {
        pdfContainer.style.marginTop = `${filterSection.offsetHeight + 0}px`;   //元々+20pxしてた名残を残したかったテヘペロ
    }


    /**
     * ダークモードのON/OFFを切り替える
     */
    function toggleDarkMode() {
        const isDarkMode = darkModeToggle.checked;
        document.body.classList.toggle('dark-mode', isDarkMode);    // bodyのクラスを切り替え
        localStorage.setItem('shounPosterDarkMode', isDarkMode);    // 設定をローカルストレージに保存
    }


    /**
     * PDFのお気に入りON/OFFの状態切り替え
     * @param {string} filename - 対象のPDFファイル名
     */
    function toggleFavorite(filename) {
        const index = favorites.indexOf(filename);
        if (index > -1) { favorites.splice(index, 1); }                 // お気に入りされていれば解除
        else { favorites.push(filename); }                              // されていなければ追加
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites)); // 更新後のお気に入りリストをローカルストレージに保存
        //リスト全体の再描画の代わりに、ボタンの状態だけを更新して効率化
        const btn = document.querySelector(`.pdf-box[data-filename="${filename}"] .favorite-btn`);
        if (btn) {
            const isFavorited = favorites.includes(filename);
            btn.classList.toggle('favorited', isFavorited);
            const img = btn.querySelector('img'); // ボタン内のimg要素を取得
            if (img) {
                img.src = isFavorited ? 'heart-solid.svg' : 'heart-regular.svg';
            }
        }
        // ただし「お気に入り」が有効な場合は、リストから要素が消える可能性があるため再描画が必要
        if (favoritesOnlyToggle.checked) {
            updatePDFList();
        }
    }


    /**
     * PDFのプレビュー用モーダルを表示する
     * @param {string} filename - プレビューするPDFのファイル名
     */
    function showPreview(filename) {
        pdfPreviewFrame.src = filename;         // iframeにPDFのパスを設定
        previewModal.classList.remove('hidden');// モーダルを表示
    }

    /**
     * PDFのプレビュー用モーダルを非表示にする
     */
    function hidePreview() {
        previewModal.classList.add('hidden');   // モーダルを隠す
        pdfPreviewFrame.src = '';               // iframeのsrcを空にしてリソースを解放
    }

    /**
     * 右クリック時にサブメニューを表示する
     * @param {MouseEvent} event - マウスイベントオブジェクト
     * @param {object} pdf - 対象のPDFデータ
     */
    function showContextMenu(event, pdf) {
        contextTargetPdf = pdf;
        contextMenu.classList.remove('hidden');
        const x = Math.min(event.clientX, window.innerWidth - contextMenu.offsetWidth - 5);     //マウスのx座標を取得
        const y = Math.min(event.clientY, window.innerHeight - contextMenu.offsetHeight - 5);   //マウスのy座標の取得
        contextMenu.style.top = `${scrollY + y}px`; //マウスのy座標にスクロールした分を足して調整
        contextMenu.style.left = `${x}px`;

        document.getElementById('context-preview').onclick = () => showPreview(contextTargetPdf.filename);
        document.getElementById('context-open-tab').onclick = () => window.open(contextTargetPdf.filename, '_blank');
        document.getElementById('context-favorite').onclick = () => toggleFavorite(contextTargetPdf.filename);
    }

    /**
     * サブメニューを非表示にする
     */
    function hideContextMenu() {
        contextMenu.classList.add('hidden');
    }

    /**
     * ローカルストレージから設定を読み込んで適用する
     */
    function loadSettings() {
        // ダークモード設定を読み込み、チェックボックスとbodyのクラスに反映
        const savedDarkMode = localStorage.getItem('shounPosterDarkMode') === 'true';
        darkModeToggle.checked = savedDarkMode;
        document.body.classList.toggle('dark-mode', savedDarkMode);

        window.addEventListener('resize', adjustPDFListMargin); // ウィンドウサイズが変更されたときにもマージン調整が走るように設定
    }
});