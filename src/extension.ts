import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";

const PREFIX = "promptis";
const participantId = "promptis.promptis";

/**
 * コマンドのインターフェースを定義します。
 *
 * @interface Command
 * @property {string} id - コマンドの識別子
 * @property {(context: vscode.ExtensionContext, ...args: any[]) => void} f - コマンドが実行されたときに呼び出される関数
 * @param {vscode.ExtensionContext} context - 拡張機能のライフサイクルを管理するためのコンテキストオブジェクト
 * @param {...any[]} args - コマンドに渡される追加の引数
 */
interface Command {
  id: string;
  f: (context: vscode.ExtensionContext, ...args: any[]) => void;
}

const commandMap: { [key: string]: Command } = {
  helloWorld: {
    id: `${PREFIX}.helloWorld`,
    f: () => {
      vscode.window.showInformationMessage("Hello World from promptis!");
    },
  },
  selectPromptDirectory: {
    id: `${PREFIX}.selectPromptDirectory`,
    f: selectPromptDirectory,
  },
  runPromptFiles: {
    id: `${PREFIX}.runPromptFiles`,
    f: runPromptFiles,
  },
};

export function activate(context: vscode.ExtensionContext) {
  // ParticipantをVSCodeに登録
  const promptis = vscode.chat.createChatParticipant(
    participantId,
    chatHandler
  );
  promptis.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "images",
    "icon.gif"
  );

  // コマンドをVSCodeに登録
  for (const [key, value] of Object.entries(commandMap)) {
    context.subscriptions.push(
      vscode.commands.registerCommand(value.id, (...args) =>
        value.f(context, ...args)
      )
    );
  }
}

/**
 * ユーザーにプロンプトファイルを含むディレクトリを選択させ、そのディレクトリパスを設定に保存する関数
 *
 * @returns {Promise<void>} - 非同期関数のため、Promise を返す
 *
 * @example
 * // 拡張機能のアクティベーション時に呼び出す
 * context.subscriptions.push(
 *   vscode.commands.registerCommand('extension.selectPromptDirectory', () => {
 *     selectPromptDirectory();
 *   })
 * );
 */
async function selectPromptDirectory(): Promise<void> {
  const options: vscode.OpenDialogOptions = {
    canSelectMany: false,
    canSelectFolders: true,
    canSelectFiles: false,
    openLabel: "Select",
    title: "Select a directory containing prompt files",
  };

  // ディレクトリ選択ダイアログの表示
  const folderUri = await vscode.window.showOpenDialog(options);
  if (folderUri && folderUri[0]) {
    const promptFolder = folderUri[0].fsPath;
    vscode.window.showInformationMessage("Selected folder: " + promptFolder);

    // 選択したディレクトリを設定に保存する
    vscode.workspace
      .getConfiguration("promptis")
      .update(
        "promptDirectory",
        promptFolder,
        vscode.ConfigurationTarget.Global
      );
  }
}

interface IPromptisChatResult extends vscode.ChatResult {}

const chatHandler: vscode.ChatRequestHandler = async (
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<IPromptisChatResult> => {
  // Received message:
  // - request.command: [undefined]
  // - request.prompt: [hello world #file:.bashrc ]
  // - request.references: [[{"id":"vscode.file","name":"file:.bashrc","range":[12,25],"value":{"$mid":1,"path":"/home/node/.bashrc","scheme":"file"}}]]
  console.debug(
    `Received message: [${request.command}], [${
      request.prompt
    }], [${JSON.stringify(request.references)}]`
  );

  const response = `Received message: [${request.command}], [${
    request.prompt
  }], [${JSON.stringify(request.references)}]`;
  console.log(response);
  const result: IPromptisChatResult = {};
  return result;
};

// TODO: 指定したディレクトリ配下の全プロンプトファイルを GitHub Copilot 経由で実行する
// - 1. プロンプトファイルの一覧を取得する
// - 2. プロンプトファイルを順番に実行する
// - 3. プロンプトファイルの結果を表示する
// - 4. プロンプトファイルの結果を保存する

/**
 * 指定したディレクトリ内のファイルを再帰的に取得する関数
 *
 * @param {string} directoryPath - ファイル一覧を取得するディレクトリのパス
 * @returns {fs.Dirent[]} - ディレクトリ内のファイルエントリの配列
 *
 * @example
 * const files = getFilesInDirectory('/path/to/directory');
 * console.log(files);
 */
function getFilesInDirectory(directoryPath: string): fs.Dirent[] {
  try {
    const entries = fs.readdirSync(directoryPath, {
      withFileTypes: true,
      recursive: true,
    });

    return entries.filter((entry) => entry.isFile());
  } catch (error) {
    console.error("Failed to read directory:", error);
    vscode.window.showErrorMessage("Failed to read directory: " + error);
    return [];
  }
}

/**
 * 指定されたプロンプトディレクトリからファイルを検索します。
 * プロンプトディレクトリが設定されていない場合、エラーメッセージを表示し、nullを返します。
 *
 * @returns {string[] | null} プロンプトディレクトリ内のファイルリスト、またはnull
 */
function findPromptFiles(): fs.Dirent[] | null {
  const CONFIG_SECTION = "promptis";
  const CONFIG_KEY = "promptDirectory";

  const promptDirectory = vscode.workspace
    .getConfiguration(CONFIG_SECTION)
    .get(CONFIG_KEY, "");

  if (promptDirectory) {
    const dirents = getFilesInDirectory(promptDirectory);
    vscode.window.showInformationMessage(
      `Found ${dirents.length} files in ${promptDirectory}`
    );
    return dirents;
  } else {
    vscode.window.showErrorMessage("Prompt directory is not set");
    return null;
  }
}

/**
 * プロンプトファイルを順番に実行する関数
 *
 * @param {vscode.ExtensionContext} context - 拡張機能のライフサイクルを管理するためのコンテキストオブジェクト
 */
function runPromptFiles(context: vscode.ExtensionContext): void {
  const dirents = findPromptFiles();
  if (!dirents) {
    return;
  }

  for (const dirent of dirents) {
    if (dirent.isFile()) {
      vscode.window.showInformationMessage(`Running ${dirent.name}`);
      const filePath = path.join(dirent.parentPath, dirent.name);
      fs.readFile(filePath, "utf8", (err, data) => {
        if (err) {
          vscode.window.showErrorMessage(`Failed to read ${filePath}`);
          return;
        }
        vscode.window.showInformationMessage(
          `Content of ${dirent.name}: ${data}`
        );
        const craftedPrompts = [vscode.LanguageModelChatMessage.User(data)];
      });
    } else {
      vscode.window.showErrorMessage(`${dirent.name} is not a file`);
    }
  }

  for (const dirent of dirents) {
    vscode.window.showInformationMessage(`Running ${dirent.name}`);
  }
}

export function deactivate() {}
