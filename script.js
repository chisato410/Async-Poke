// 必要なHTML要素を取得
const container = document.querySelector(".container"); // ポケモン情報表示用
const submitButton = document.querySelector("#submit"); // 検索ボタン
const pokemonNameInput = document.querySelector("#pokemonName"); // テキスト入力欄（日本語ポケモン名）

// 検索履歴表示用コンテナを動的に作成してbodyに追加
const historyContainer = document.createElement("div");
historyContainer.className = "history-container";
document.body.appendChild(historyContainer);

let japaneseToEnglishMap = {}; // 日本語名 → 英語名の変換マップ
let searchHistory = []; // 検索履歴（最大10件）

// タイプごとの背景色設定（タイプカラー）
const typeColors = {
  fire: "#F08030",
  water: "#6890F0",
  electric: "#F8D030",
  grass: "#78C850",
  ice: "#98D8D8",
  fighting: "#C03028",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
  normal: "#A8A878",
};

// タイプごとの簡易アイコン（絵文字）
const typeIcons = {
  fire: "🔥",
  water: "💧",
  electric: "⚡",
  grass: "🍃",
  ice: "❄️",
  fighting: "🥊",
  poison: "☠️",
  ground: "🌍",
  flying: "🕊️",
  psychic: "🔮",
  bug: "🐛",
  rock: "🪨",
  ghost: "👻",
  dragon: "🐉",
  dark: "🌑",
  steel: "⚙️",
  fairy: "🧚",
  normal: "⭐",
};

// 日本語ポケモン名と英語名の対応マップをAPIから取得
const fetchPokemonList = async () => {
  try {
    const response = await fetch(
      "https://pokeapi.co/api/v2/pokemon-species?limit=10000"
    );
    const data = await response.json();
    const speciesList = data.results;

    // 1匹ずつ日本語名を取得してマッピング
    for (const species of speciesList) {
      const res = await fetch(species.url);
      const speciesData = await res.json();
      const japaneseNameEntry = speciesData.names.find(
        (n) => n.language.name === "ja"
      );
      if (japaneseNameEntry) {
        japaneseToEnglishMap[japaneseNameEntry.name] = species.name;
      }
    }
    console.log("日本語名マッピング完了", japaneseToEnglishMap);
  } catch (error) {
    console.error("ポケモンリストの取得に失敗しました:", error);
  }
};

// ページロード時にマッピング取得開始
window.addEventListener("load", fetchPokemonList);

// ポケモンタイプに応じた背景色を設定する関数
const setBackgroundByType = (types) => {
  if (types.length === 0) {
    // タイプが不明の場合
    container.style.backgroundColor = "white";
    container.style.color = "#222";
    return;
  }
  const primaryType = types[0]; // 1番目のタイプを基準に
  container.style.backgroundColor = typeColors[primaryType] || "white";

  // 背景色によって文字色を変更（見やすさ調整）
  const lightTypes = ["electric", "grass", "ice", "fairy"];
  if (lightTypes.includes(primaryType)) {
    container.style.color = "#222"; // 黒系文字
  } else {
    container.style.color = "white"; // 白系文字
  }
};

// 検索ボタンクリック時の処理
submitButton.addEventListener("click", async () => {
  const inputName = pokemonNameInput.value.trim();
  if (!inputName) {
    // 空欄チェック
    container.textContent = "ポケモンの名前を入力してください";
    container.style.backgroundColor = "white";
    container.style.color = "#222";
    return;
  }

  // 日本語名から英語名を取得
  const englishName = japaneseToEnglishMap[inputName];
  if (!englishName) {
    container.textContent = "その名前のポケモンは見つかりませんでした";
    container.style.backgroundColor = "white";
    container.style.color = "#222";
    return;
  }

  container.textContent = "取得中..."; // ロード中表示
  container.style.backgroundColor = "white";
  container.style.color = "#222";

  try {
    // ポケモン基本データ取得
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${englishName}`
    );
    if (!response.ok) throw new Error("ポケモンデータの取得に失敗しました");
    const data = await response.json();

    const types = data.types.map((t) => t.type.name); // タイプ
    setBackgroundByType(types); // 背景色変更

    // ポケモン図鑑（species）データ取得
    const speciesRes = await fetch(data.species.url);
    const speciesData = await speciesRes.json();

    // 日本語名取得
    const japaneseName = speciesData.names.find(
      (n) => n.language.name === "ja"
    ).name;

    // 特性（日本語名）取得
    const abilities = await Promise.all(
      data.abilities.map(async (abilityInfo) => {
        const abilityRes = await fetch(abilityInfo.ability.url);
        const abilityData = await abilityRes.json();
        const jaAbility = abilityData.names.find(
          (n) => n.language.name === "ja"
        );
        return jaAbility ? jaAbility.name : abilityInfo.ability.name;
      })
    );

    // 最新の日本語図鑑説明文取得（改行・改ページをスペースに）
    const flavorEntry =
      speciesData.flavor_text_entries
        .filter((entry) => entry.language.name === "ja")
        .reverse()[0]
        ?.flavor_text.replace(/\n|\f/g, " ") || "説明なし";

    // 身長・体重（デシメートル→m、ヘクトグラム→kg）
    const heightM = data.height / 10;
    const weightKg = data.weight / 10;

    // 検索履歴に追加
    addHistory(japaneseName);

    // 画面表示
    container.innerHTML = "";
    showPokemon({
      name: japaneseName,
      imageDefault: data.sprites.front_default,
      imageShiny: data.sprites.front_shiny,
      abilities,
      types,
      height: heightM,
      weight: weightKg,
      description: flavorEntry,
    });
  } catch (error) {
    container.textContent = error.message;
    console.error(`Error: ${error}`);
    container.style.backgroundColor = "white";
    container.style.color = "#222";
  } finally {
    console.log("Finished!"); // 処理終了
  }
});

// 検索履歴を追加＆表示
const addHistory = (name) => {
  if (!searchHistory.includes(name)) {
    searchHistory.unshift(name); // 先頭に追加
    if (searchHistory.length > 10) searchHistory.pop(); // 最大10件
  }
  renderHistory();
};

// 検索履歴の表示処理
const renderHistory = () => {
  if (searchHistory.length === 0) {
    historyContainer.innerHTML = "";
    return;
  }
  // 履歴表示（クリックで再検索可能）
  historyContainer.innerHTML = `
    <h3>検索履歴</h3>
    <div>
      ${searchHistory
        .map(
          (name) => `<button type="button" class="history-btn">${name}</button>`
        )
        .join("")}
    </div>
  `;
  // ボタンにクリックイベント付与
  historyContainer.querySelectorAll(".history-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      pokemonNameInput.value = btn.textContent;
      submitButton.click();
    });
  });
};

// ポケモン情報の表示処理
const showPokemon = ({
  name,
  imageDefault,
  imageShiny,
  abilities,
  types,
  height,
  weight,
  description,
}) => {
  let isShiny = false; // 色違い切替フラグ

  // 色違い切替ボタン生成
  const toggleBtn = document.createElement("button");
  toggleBtn.id = "toggleShiny";
  toggleBtn.textContent = "色違いを表示";
  toggleBtn.addEventListener("click", () => {
    isShiny = !isShiny; // 状態反転
    img.src = isShiny ? imageShiny : imageDefault;
    toggleBtn.textContent = isShiny ? "通常色を表示" : "色違いを表示";
  });

  // ポケモン情報HTML表示
  container.innerHTML = `
    <h2>${name}</h2>
    <div id="typeIcons" style="margin-bottom: 10px;"></div>
    <img src="${imageDefault}" alt="${name}" id="pokemonImage" />
    <p><strong>高さ:</strong> ${height} m　<strong>重さ:</strong> ${weight} kg</p>
    <h3>特性</h3>
    <ul>
      ${abilities.map((ability) => `<li>${ability}</li>`).join("")}
    </ul>
    <div class="description">${description}</div>
  `;

  // タイプアイコン＋ラベル表示
  const typeIconsContainer = container.querySelector("#typeIcons");
  types.forEach((t) => {
    const span = document.createElement("span");
    span.className = "type-label";
    span.style.backgroundColor = typeColors[t] || "#666"; // 背景色
    span.textContent = `${typeIcons[t] || ""} ${t}`; // 絵文字＋タイプ名
    typeIconsContainer.appendChild(span);
  });

  // 色違いボタン表示
  const img = container.querySelector("#pokemonImage");
  container.insertBefore(toggleBtn, img);

  // 5%の確率でキラキラエフェクト
  if (Math.random() < 0.05) {
    addSparkles();
  }
};

// キラキラ演出を追加（ランダム配置）
const addSparkles = (count = 15) => {
  for (let i = 0; i < count; i++) {
    const sparkle = document.createElement("div");
    sparkle.classList.add("sparkle");
    sparkle.style.top = `${Math.random() * 80 + 10}%`; // 10%〜90%
    sparkle.style.left = `${Math.random() * 80 + 10}%`;
    sparkle.style.animationDuration = Math.random() * 1 + 0.5 + "s";
    sparkle.style.animationDelay = Math.random() * 1.5 + "s";
    container.appendChild(sparkle);
  }
};
