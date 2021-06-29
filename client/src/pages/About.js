import { useEffect, useState } from "react";

const About = () => {
	const [results, setResults] = useState([]);
	useEffect(() => {
		fetch("/api/terms/term", { method: 'POST', body: JSON.stringify({termid: 1})})
			.then((res) => {
				if (!res.ok) {
					throw new Error(res.statusText);
				}
				return res.json();
			})
			.then(results => {
				setResults(results);
			})
			.catch((err) => {
				console.error(err);
			});
	}, []);

	return (
		<main role="main">
			<div>
				<h1>Terms</h1>
				<ul>
				{ results.map(term => 
					<li key={term.id}><b>{term.term}</b> - {term.definition}</li>	
				  )
				}
				</ul>
			</div>
		</main>
	);
};

export default About;
