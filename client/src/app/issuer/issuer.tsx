// "use client";
// import { useState , useEffect} from "react";
// import { getTodos, addTodo } from '../../lib/api';

// // type UserDataReq = {
// //   name: string
// //   affiliation: string
// //   email: string
// //   tel: string
// //   address: string
// // };

// interface Todo {
//     id: string;
//     text: string;
//   }

// // type Credential = {
// // 	credential_ID: string 
// // 	subject: string 
// // 	claim: string
// // 	issuer: string
// // 	holder: string 
// // 	start_Time: string 
// // 	end_Time: string 
// // }

// export default function Home() {
// //   const [credentialdata, setCredentialdata] = useState<Credential>(
// //     {credential_ID: "", 
// //         subject: "",
// //         claim: "",
// //       issuer: "",
// //       holder: "",
// //       start_Time: "",
// //       end_Time: ""
// //     }
// //   );
// //   const [vc, setVC] = useState<string>("");
// //   const [vp, setVP] = useState<string>("");

//   const [todos, setTodos] = useState<Todo[]>([]);
//   const [newTodo, setNewTodo] = useState<string>('');

//   // 初回レンダリングのデータ取得
//   useEffect(() => {
//     const fetchTodos = async () => {
//       const data = await getTodos();
//       setTodos(data);
//     };
//     fetchTodos();
//   }, []);

//   //Todoを追加する処理
//   const handleAddTodo = async () => {
//     if (newTodo.trim() === '') return;
//     const addedTodo = await addTodo(newTodo);
//     setTodos([...todos, addedTodo]);
//     setNewTodo('');
//   };

//   return (
//     <main>
//       <div>
//         <h1>TODO List</h1>
//         <ul>
//             {todos.map((todo) => (
//             <li key={todo.id}>{todo.text}</li>
//             ))}
//         </ul>
//         <input
//             type="text"
//             value={newTodo}
//             onChange={(e) => setNewTodo(e.target.value)}
//         />
//         <button onClick={handleAddTodo}>Add TODO</button>
//       </div>
//       {/* <div>
//         <h1>証明発行ページ</h1>
//         <h2>①五つの回答欄を入力した後に登録ボタンを押してください！</h2>
//         <h3>ID: {credentialdata.credential_ID}</h3>
//         <input id="credential_ID" type="text" onChange={(e) => setCredentialdata((prev) => ({
//           ...prev,
//           credential_ID: e.target.value,
//         }))}></input>
//         <h3>発行内容: {credentialdata.subject}</h3>
//         <input id="subject" type="text" onChange={(e) => setCredentialdata((prev) => ({
//           ...prev,
//           subject: e.target.value,
//         }))}></input>
//         <h3>詳細な情報: {credentialdata.claim}</h3>
//         <input id="claim" type="text" onChange={(e) => setCredentialdata((prev) => ({
//           ...prev,
//           claim: e.target.value,
//         }))}></input>
//         <h3>発行者: {credentialdata.issuer}</h3>
//         <input id="issuer" type="text" onChange={(e) => setCredentialdata((prev) => ({
//           ...prev,
//           issuer: e.target.value,
//         }))}></input>
//         <h3>保有者: {credentialdata.holder}</h3>
//         <input id="holder" type="text" onChange={(e) => setCredentialdata((prev) => ({
//           ...prev,
//           holder: e.target.value,
//         }))}></input>
//         <h3>対象の開始時間: {credentialdata.start_Time}</h3>
//         <input id="start_Time" type="text" onChange={(e) => setCredentialdata((prev) => ({
//           ...prev,
//           start_Time: e.target.value,
//         }))}></input>
//         <h3>対象の終了時間: {credentialdata.end_Time}</h3>
//         <input id="end_Time" type="text" onChange={(e) => setCredentialdata((prev) => ({
//           ...prev,
//           end_Time: e.target.value,
//         }))}></input>
//         <br/>
//         <button onClick={() => {
//           console.log(JSON.stringify(credentialdata))
//           const res = fetch('http://127.0.0.1:8081/register', {
//             method: 'POST',
//             headers:{ 'Content-Type': 'application/json'},
//             body: JSON.stringify(credentialdata),
//           })        
//         }}>②項目を記入し登録情報を確認する</button>
//         <br/>
//         <button onClick={async () => {
//           console.log(JSON.stringify(credentialdata))
//           const res = await fetch('http://127.0.0.1:8081/generatevc', {
//             method: 'POST',
//             headers:{ 'Content-Type': 'application/json'},
//           })
//           const body = await res.json()
//           setVC(body.jwt)
//         }}>③VCを発行する</button>
//         <br/>
//         <div>
//           {vc}
//         </div>
//         <br/>
//         <button onClick={async () => {
//           console.log(JSON.stringify(credentialdata))
//           console.log(vc);
//           const res = await fetch('http://127.0.0.1:8081/generatevp', {
//             method: 'POST',
//             headers:{ 'Content-Type': 'application/json'},
          
//             body: JSON.stringify({
//               vc: vc
//             })
//           })
//           const body = await res.json()
//           setVP(body.jwt)
//         }}>④VPのテキストファイルを入手する</button>
//         <br/>
//         <div>
//           {vp}
//         </div> */}
//       {/* </div> */}
//     </main>
//   );
// }
  