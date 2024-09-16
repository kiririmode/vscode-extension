import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

const PREFIX = "promptis";
const participantId = "promptis.promptis";

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

  // コマンドを登録
  context.subscriptions.push(
    vscode.commands.registerCommand(`${PREFIX}.helloWorld`, () => {
      vscode.window.showInformationMessage("Hello World from promptis!");
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      `${PREFIX}.selectPromptDirectory`,
      selectPromptDirectory
    )
  );
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
 * 指定したディレクトリ内のファイル一覧を取得する関数
 * @param directoryPath - ファイル一覧を取得するディレクトリのパス
 * @returns ファイル名の配列
 */
function getFilesInDirectory(directoryPath: string): string[] {
  try {
    const entries = fs.readdirSync(directoryPath, {
      withFileTypes: true,
      recursive: true,
    });

    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(directoryPath, entry.name));
  } catch (error) {
    console.error("Failed to read directory:", error);
    vscode.window.showErrorMessage("Failed to read directory: " + error);
    return [];
  }
}

export function deactivate() {}
