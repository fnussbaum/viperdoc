module.exports = function(hljs) {
  return {
    keywords: {
      keyword: "assume assert inhale exhale var returns field define if else elseif while statelabel label goto acc forperm forall exists folding unfolding packaging applying old perm result let domain range fold unfold package apply wand fresh constraining requires ensures invariant decreases new function axiom import predicate domain method adt derives",
      literal: "false true null write none wildcard",
      type: "Bool Int Ref Perm Rational Set Seq Multiset Map",
      operator: "union in intersection setminus subset :: ++ + - * / % := : == != && || --* ==> > >= < <=",
    },
    contains: [
      hljs.QUOTE_STRING_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
    ],
  };
};
